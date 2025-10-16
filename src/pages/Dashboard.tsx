// src/pages/Dashboard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { slugify, slugifyAr } from "../lib/slug";
import * as XLSX from "xlsx";

/** DB row we render */
type Row = {
  id: number;
  // English
  name: string;
  people_count: number;
  people_names: string[] | null;
  people_rsvps: (("coming" | "not_coming") | null)[] | null;
  slug: string;
  alt_slug: string | null;
  // Arabic
  name_ar: string | null;
  people_names_ar: string[] | null;
  slug_ar: string | null;
  alt_slug_ar: string | null;
};

type PeopleGroups = {
  coming: string[];
  not: string[];
  pending: string[];
  total: number;
};

function namesForRow(r: Row): string[] {
  // Prefer Arabic names if present; else English; else placeholders
  if (r.people_names_ar && r.people_names_ar.length > 0) return r.people_names_ar;
  if (r.people_names && r.people_names.length > 0) return r.people_names;
  return Array.from({ length: r.people_count }, (_, i) => `Person ${i + 1}`);
}

function groupPeople(rows: Row[]): PeopleGroups {
  const g: PeopleGroups = { coming: [], not: [], pending: [], total: 0 };
  for (const r of rows) {
    const names = namesForRow(r);
    const rsvps = r.people_rsvps ?? [];
    names.forEach((n, i) => {
      const label = `${n} — ${r.name_ar?.trim() || r.name}`;
      const v = rsvps[i];
      if (v === "coming") g.coming.push(label);
      else if (v === "not_coming") g.not.push(label);
      else g.pending.push(label);
    });
  }
  g.total = g.coming.length + g.not.length + g.pending.length;
  return g;
}

export default function Dashboard() {
  // ----- access gate -----
  const [params] = useSearchParams();
  const ok = useMemo(
    () => params.get("key") === import.meta.env.VITE_DASHBOARD_KEY,
    [params]
  );
  if (!ok)
    return (
      <div className="min-h-[60vh] grid place-items-center opacity-60">404</div>
    );

  // ----- state -----
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const baseUrl = window.location.origin;

  // ----- data loader -----
  const loadGuests = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("guests")
      .select(
        `
          id,name,people_count,people_names,people_rsvps,slug,alt_slug,
          name_ar,people_names_ar,slug_ar,alt_slug_ar
        `
      )
      .order("name", { ascending: true });

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  // ----- realtime + initial load (debounced) -----
  useEffect(() => {
    void loadGuests();

    let t: number | null = null;
    const bump = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => void loadGuests(), 120);
    };

    const channel = supabase
      .channel("rsvp-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guests" },
        bump
      )
      .subscribe();

    return () => {
      if (t) window.clearTimeout(t);
      channel.unsubscribe();
    };
  }, [loadGuests]);

  // ----- totals (people) across ALL rows -----
  const peopleTotals = useMemo(() => {
    const tally = { coming: 0, not: 0, pending: 0, total: 0 };
    for (const r of rows) {
      const names = namesForRow(r);
      const rsvps = r.people_rsvps ?? [];
      names.forEach((_, i) => {
        const v = rsvps[i];
        if (v === "coming") tally.coming += 1;
        else if (v === "not_coming") tally.not += 1;
        else tally.pending += 1;
      });
    }
    tally.total = tally.coming + tally.not + tally.pending;
    return tally;
  }, [rows]);

  // ----- filtering -----
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) => {
      const namesEn = (r.people_names ?? []).join(", ");
      const namesAr = (r.people_names_ar ?? []).join(", ");
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.name_ar ?? "").toLowerCase().includes(needle) ||
        r.slug.toLowerCase().includes(needle) ||
        (r.slug_ar ?? "").toLowerCase().includes(needle) ||
        (r.alt_slug ?? "").toLowerCase().includes(needle) ||
        (r.alt_slug_ar ?? "").toLowerCase().includes(needle) ||
        namesEn.toLowerCase().includes(needle) ||
        namesAr.toLowerCase().includes(needle) ||
        String(r.people_count).includes(needle)
      );
    });
  }, [rows, q]);

  const filteredPeopleHint = useMemo(() => {
    const hint = { coming: 0, not: 0, pending: 0 };
    for (const r of filtered) {
      const names = namesForRow(r);
      const rsvps = r.people_rsvps ?? [];
      names.forEach((_, i) => {
        const v = rsvps[i];
        if (v === "coming") hint.coming += 1;
        else if (v === "not_coming") hint.not += 1;
        else hint.pending += 1;
      });
    }
    return hint;
  }, [filtered]);

  const allPeople = useMemo(() => groupPeople(rows), [rows]);
  const viewPeople = useMemo(() => groupPeople(filtered), [filtered]);

  // ====== Export to Excel (kept your structure, now Arabic-aware) ======
  const exportExcel = () => {
    const by = <T, K extends keyof any>(arr: T[], key: (x: T) => K) =>
      [...arr].sort((a, b) => String(key(a)).localeCompare(String(key(b))));
    const sheet = (rows: any[], name: string, widths?: number[], filter = true) => {
      const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
      if (filter && ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] as string };
      if (widths) ws["!cols"] = widths.map((wch) => ({ wch }));
      (ws as any)["!freeze"] = { rows: 1, cols: 0 };
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    const linkFor = (r: Row) =>
      `${baseUrl}/invite/${encodeURIComponent(
        r.alt_slug_ar ?? r.slug_ar ?? r.alt_slug ?? r.slug
      )}`;

    // flatten people (Arabic-first naming)
    const peopleRowsRaw: Array<{
      Household: string;
      HouseholdAr: string;
      PersonIndex: number;
      Name: string;
      NameAr: string;
      Status: "coming" | "not_coming" | "pending";
      InviteLink: string;
    }> = [];

    for (const r of rows) {
      const namesEn = r.people_names ?? [];
      const namesAr = r.people_names_ar ?? [];
      const rsvps = r.people_rsvps ?? [];
      const L = Math.max(namesEn.length, namesAr.length, r.people_count, rsvps.length);
      for (let i = 0; i < L; i++) {
        const v = rsvps[i];
        const status =
          v === "coming" ? "coming" : v === "not_coming" ? "not_coming" : "pending";
        peopleRowsRaw.push({
          Household: r.name,
          HouseholdAr: r.name_ar ?? "",
          PersonIndex: i + 1,
          Name: namesEn[i] ?? "",
          NameAr: namesAr[i] ?? "",
          Status: status,
          InviteLink: linkFor(r),
        });
      }
    }

    const peopleRows = by(peopleRowsRaw, (p) => `${p.Household}__${p.PersonIndex}`);

    const comingRows = peopleRows.filter((p) => p.Status === "coming");
    const notRows = peopleRows.filter((p) => p.Status === "not_coming");
    const pendingRows = peopleRows.filter((p) => p.Status === "pending");

    // Households sheet
    const households = by(
      rows.map((r) => {
        const namesEn = r.people_names ?? [];
        const namesAr = r.people_names_ar ?? [];
        const rsvps = r.people_rsvps ?? [];
        const coming = rsvps.filter((x) => x === "coming").length;
        const notComing = rsvps.filter((x) => x === "not_coming").length;
        const pending = Math.max(namesForRow(r).length, r.people_count) - (coming + notComing);
        return {
          Household: r.name,
          HouseholdAr: r.name_ar ?? "",
          People: r.people_count,
          NamesEN: namesEn.join(", "),
          NamesAR: namesAr.join(", "),
          ComingCount: coming,
          NotComingCount: notComing,
          PendingCount: pending,
          InviteLink: linkFor(r),
          Slug: r.slug,
          AltSlug: r.alt_slug ?? "",
          SlugAr: r.slug_ar ?? "",
          AltSlugAr: r.alt_slug_ar ?? "",
        };
      }),
      (h) => h.Household
    );

    const wb = XLSX.utils.book_new();
    sheet(households, "Households", [28, 28, 8, 50, 50, 10, 12, 10, 50, 24, 24, 24, 24]);
    sheet(peopleRows, "People", [28, 28, 10, 24, 24, 14, 50]);
    sheet(comingRows, "Coming", [28, 28, 10, 24, 24, 14, 50]);
    sheet(notRows, "NotComing", [28, 28, 10, 24, 24, 14, 50]);
    sheet(pendingRows, "Pending", [28, 28, 10, 24, 24, 14, 50]);
    XLSX.writeFile(wb, "rsvp-export.xlsx");
  };

  // ----- UI -----
  return (
    <div className="mx-auto max-w-screen-2xl px-4 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Add guest + Export */}
      <section className="border rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold mb-3">Add Guest</h2>
          <button
            onClick={exportExcel}
            className="rounded bg-indigo-600 text-white px-4 py-2 text-sm hover:opacity-90"
            title="Export all households and people to an Excel file"
          >
            Export Excel
          </button>
        </div>
        <AddGuestForm onAdded={loadGuests} />
      </section>

      {/* Stats + Search */}
      <div className="grid gap-3 sm:grid-cols-6">
        <Stat label="Households" value={rows.length} />
        <Stat label="Coming (household)" value={0} />
        <Stat label="Not coming (household)" value={0} />
        <Stat label="Pending (household)" value={rows.length} />
        <Stat label="People total" value={peopleTotals.total} />
        <div className="rounded-lg border bg-white p-4">
          <label className="text-xs opacity-60 block mb-1">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name / slug / people / visitor / العربية"
            className="w-full rounded border px-3 py-2"
          />
          <div className="text-xs opacity-60 mt-2">
            People: {filteredPeopleHint.coming} coming · {filteredPeopleHint.not} not ·{" "}
            {filteredPeopleHint.pending} pending
          </div>
        </div>
      </div>

      {/* People breakdown */}
      <section className="border rounded-lg bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">People breakdown</h2>
          <div className="text-sm opacity-70">
            Total (all): {allPeople.total} · Coming {allPeople.coming.length} · Not{" "}
            {allPeople.not.length} · Pending {allPeople.pending.length}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="mb-2 font-medium text-emerald-700">
              Coming ({viewPeople.coming.length})
            </div>
            {viewPeople.coming.length === 0 ? (
              <div className="text-sm opacity-60">—</div>
            ) : (
              <ul className="text-sm space-y-1 list-disc pl-5">
                {viewPeople.coming.map((n, i) => (
                  <li key={`c-${i}`}>{n}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 font-medium text-rose-700">
              Not coming ({viewPeople.not.length})
            </div>
            {viewPeople.not.length === 0 ? (
              <div className="text-sm opacity-60">—</div>
            ) : (
              <ul className="text-sm space-y-1 list-disc pl-5">
                {viewPeople.not.map((n, i) => (
                  <li key={`n-${i}`}>{n}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 font-medium text-amber-700">
              Pending ({viewPeople.pending.length})
            </div>
            {viewPeople.pending.length === 0 ? (
              <div className="text-sm opacity-60">—</div>
            ) : (
              <ul className="text-sm space-y-1 list-disc pl-5">
                {viewPeople.pending.map((n, i) => (
                  <li key={`p-${i}`}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="border rounded-lg bg-white">
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm min-w-[1300px]">
            <thead className="bg-gray-50 text-left">
              <tr className="[&_th]:py-3 [&_th]:px-4">
                <th className="w-[18%]">Name (EN)</th>
                <th className="w-[18%]">الاسم (AR)</th>
                <th className="w-14">People</th>
                <th className="w-[18%]">Names (EN)</th>
                <th className="w-[18%]">الأسماء (AR)</th>
                <th className="w-[16%]">(people)</th>
                <th className="w-[18%]">Invite Link</th>
                <th className="w-[220px] text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center opacity-60">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center opacity-60">
                    No guests match.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <RowItem
                    key={r.id}
                    row={r}
                    baseUrl={baseUrl}
                    onChanged={loadGuests}
                    onError={setErr}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {err && <div className="p-3 text-rose-700 text-xs">Error: {err}</div>}
      </section>

      <p className="text-xs opacity-60">Live updates enabled.</p>
    </div>
  );
}

/* ==================== AddGuestForm ==================== */

function AddGuestForm({ onAdded }: { onAdded: () => void }) {
  // EN
  const [householdEn, setHouseholdEn] = useState("");
  const [namesEn, setNamesEn] = useState<string[]>([""]);
  // AR
  const [householdAr, setHouseholdAr] = useState("");
  const [namesAr, setNamesAr] = useState<string[]>([""]);

  const [count, setCount] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setNamesEn((prev) => {
      const next = [...prev];
      if (count > next.length) while (next.length < count) next.push("");
      if (count < next.length) next.length = Math.max(1, count);
      return next;
    });
    setNamesAr((prev) => {
      const next = [...prev];
      if (count > next.length) while (next.length < count) next.push("");
      if (count < next.length) next.length = Math.max(1, count);
      return next;
    });
  }, [count]);

  const slugFromEn = (n: string) => `${slugify(n)}-invitation`;
  const slugFromAr = (n: string) => `${slugifyAr(n)}-دعوة`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const cleanEn = namesEn.map((s) => s.trim()).filter(Boolean);
    const cleanAr = namesAr.map((s) => s.trim()).filter(Boolean);

    const enSlug = slugFromEn(householdEn.trim() || cleanEn[0] || "invite");
    const arSlug =
      (householdAr.trim() || cleanAr[0])
        ? slugFromAr(householdAr.trim() || cleanAr[0])
        : null;

    const alt_en = cleanEn[0] ? slugFromEn(cleanEn[0]) : null;
    const alt_ar = cleanAr[0] ? slugFromAr(cleanAr[0]) : null;

    const { error } = await supabase.from("guests").insert([
      {
        // EN
        name: householdEn.trim() || null,
        people_count: count,
        people_names: cleanEn.length ? cleanEn : null,
        people_rsvps: null,
        slug: enSlug,
        alt_slug: alt_en,

        // AR
        name_ar: householdAr.trim() || null,
        people_names_ar: cleanAr.length ? cleanAr : null,
        slug_ar: arSlug,
        alt_slug_ar: alt_ar,
      },
    ]);

    setSaving(false);
    if (error) {
      setMsg(`Error: ${error.message}`);
      return;
    }
    setMsg(
      `Added. Link: /invite/${encodeURIComponent(alt_ar ?? arSlug ?? alt_en ?? enSlug)}`
    );
    setHouseholdEn("");
    setHouseholdAr("");
    setCount(1);
    setNamesEn([""]);
    setNamesAr([""]);
    onAdded();
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      {/* English title */}
      <div>
        <label className="block text-xs opacity-70 mb-1">
          Household / Invite name (EN)
        </label>
        <input
          value={householdEn}
          onChange={(e) => setHouseholdEn(e.target.value)}
          placeholder="Ali & Rouaa"
          className="w-full rounded border px-3 py-2"
        />
      </div>

      {/* Arabic title */}
      <div dir="rtl">
        <label className="block text-xs opacity-70 mb-1">اسم الدعوة (AR)</label>
        <input
          value={householdAr}
          onChange={(e) => setHouseholdAr(e.target.value)}
          placeholder="عائلة علي"
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs opacity-70 mb-1">Number of visitors</label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
            }
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      {/* Names EN */}
      <div>
        <label className="block text-xs opacity-70 mb-1">Visitor names (EN)</label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <input
              key={`en-${i}`}
              value={namesEn[i] ?? ""}
              onChange={(e) =>
                setNamesEn((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })
              }
              placeholder={`Visitor ${i + 1} name`}
              className="w-full min-w-[14rem] rounded border px-3 py-2"
            />
          ))}
        </div>
      </div>

      {/* Names AR */}
      <div dir="rtl">
        <label className="block text-xs opacity-70 mb-1">أسماء الزائرين (AR)</label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <input
              key={`ar-${i}`}
              value={namesAr[i] ?? ""}
              onChange={(e) =>
                setNamesAr((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })
              }
              placeholder={`اسم الزائر ${i + 1}`}
              className="w-full min-w-[14rem] rounded border px-3 py-2"
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-emerald-600 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add guest"}
        </button>
        {msg && <span className="text-xs opacity-70">{msg}</span>}
      </div>
    </form>
  );
}

/* ==================== RowItem ==================== */

function RowItem({
  row,
  baseUrl,
  onChanged,
  onError,
}: {
  row: Row;
  baseUrl: string;
  onChanged: () => void;
  onError: (m: string | null) => void;
}) {
  const [edit, setEdit] = useState(false);

  // EN
  const [name, setName] = useState(row.name);
  const [namesEn, setNamesEn] = useState<string[]>(
    row.people_names ?? Array.from({ length: row.people_count }, () => "")
  );

  // AR
  const [nameAr, setNameAr] = useState(row.name_ar ?? "");
  const [namesAr, setNamesAr] = useState<string[]>(
    row.people_names_ar ?? Array.from({ length: row.people_count }, () => "")
  );

  const [count, setCount] = useState<number>(row.people_count);
  const [rsvps, setRsvps] = useState<(("coming" | "not_coming") | null)[]>(
    row.people_rsvps ?? Array.from({ length: row.people_count }, () => null)
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNamesEn((prev) => {
      const next = [...prev];
      if (count > next.length) next.push(...Array(count - next.length).fill(""));
      if (count < next.length) next.length = count;
      return next;
    });
    setNamesAr((prev) => {
      const next = [...prev];
      if (count > next.length) next.push(...Array(count - next.length).fill(""));
      if (count < next.length) next.length = count;
      return next;
    });
    setRsvps((prev) => {
      const next = [...prev];
      if (count > next.length) next.push(...Array(count - next.length).fill(null));
      if (count < next.length) next.length = count;
      return next;
    });
  }, [count]);

  const chosenNames = namesForRow({
    ...row,
    name: name,
    name_ar: nameAr || null,
    people_names: namesEn,
    people_names_ar: namesAr,
  });

  const coming = chosenNames.filter((_, i) => rsvps[i] === "coming");
  const not = chosenNames.filter((_, i) => rsvps[i] === "not_coming");
  const pend = chosenNames.filter((_, i) => !rsvps[i]);

  const chosenSlug =
    row.alt_slug_ar ??
    row.slug_ar ??
    row.alt_slug ??
    row.slug;

  const link = `${baseUrl}/invite/${encodeURIComponent(chosenSlug)}`;

  const save = async () => {
    setBusy(true);
    onError(null);

    const cleanedEn = namesEn.map((s) => s.trim());
    const cleanedAr = namesAr.map((s) => s.trim());
    const newRsvps = rsvps.map((v) =>
      v === "coming" || v === "not_coming" ? v : null
    );

    // recompute slugs only if empty (don’t override existing)
    const payload: Partial<Row> = {
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      people_count: count,
      people_names: cleanedEn,
      people_names_ar: cleanedAr,
      people_rsvps: newRsvps,
      slug: row.slug || `${slugify(name || cleanedEn[0] || "invite")}-invitation`,
      slug_ar:
        row.slug_ar ||
        (nameAr || cleanedAr[0]
          ? `${slugifyAr(nameAr || cleanedAr[0])}-دعوة`
          : null),
    };

    const { error } = await supabase.from("guests").update(payload).eq("id", row.id);
    setBusy(false);
    if (error) {
      onError(error.message);
      return;
    }
    setEdit(false);
    onChanged();
  };

  const del = async () => {
    if (!confirm(`Delete "${row.name}"? This also removes their responses.`)) return;
    setBusy(true);
    onError(null);
    const { error } = await supabase.from("guests").delete().eq("id", row.id);
    setBusy(false);
    if (error) {
      onError(error.message);
      return;
    }
    onChanged();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    alert("Copied:\n" + link);
  };

  return (
    <tr className="[&_td]:py-2.5 [&_td]:px-4 align-top">
      <td className="w-[18%] font-medium">
        {edit ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        ) : (
          row.name || "—"
        )}
      </td>

      <td className="w-[18%]" dir="rtl">
        {edit ? (
          <input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="الاسم بالعربية"
          />
        ) : (
          row.name_ar || "—"
        )}
      </td>

      <td className="w-14">
        {edit ? (
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
            }
            className="w-14 border rounded px-2 py-1"
          />
        ) : (
          row.people_count
        )}
      </td>

      <td className="w-[18%]">
        {edit ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <input
                key={`ne-${i}`}
                value={namesEn[i] || ""}
                onChange={(e) => {
                  const next = [...namesEn];
                  next[i] = e.target.value;
                  setNamesEn(next);
                }}
                placeholder={`Visitor ${i + 1} name`}
                className="w-full min-w-[14rem] border rounded px-3 py-2"
              />
            ))}
          </div>
        ) : (
          (row.people_names ?? []).join(", ") || "—"
        )}
      </td>

      <td className="w-[18%]" dir="rtl">
        {edit ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <input
                key={`na-${i}`}
                value={namesAr[i] || ""}
                onChange={(e) => {
                  const next = [...namesAr];
                  next[i] = e.target.value;
                  setNamesAr(next);
                }}
                placeholder={`اسم الزائر ${i + 1}`}
                className="w-full min-w-[14rem] border rounded px-3 py-2"
              />
            ))}
          </div>
        ) : (
          (row.people_names_ar ?? []).join(", ") || "—"
        )}
      </td>

      <td className="w-[16%]">
        <div className="space-y-1">
          <BadgePill n={coming.length} text="coming" tone="emerald" />
          <BadgePill n={not.length} text="not" tone="rose" />
          <BadgePill n={pend.length} text="pending" tone="amber" />
        </div>
        <div className="mt-2 text-xs opacity-70">
          {coming.length > 0 && (
            <div className="mb-1">
              <span className="font-medium">Coming:</span> {coming.join(", ")}
            </div>
          )}
          {not.length > 0 && (
            <div className="mb-1">
              <span className="font-medium">Not:</span> {not.join(", ")}
            </div>
          )}
          {pend.length > 0 && (
            <div>
              <span className="font-medium">Pending:</span> {pend.join(", ")}
            </div>
          )}
        </div>
      </td>

      <td className="w-[18%] text-xs">
        /invite/
        <span className="font-mono">
          {row.alt_slug_ar ?? row.slug_ar ?? row.alt_slug ?? row.slug}
        </span>
      </td>

      <td className="w-[220px] text-right">
        {edit ? (
          <div className="inline-flex gap-2">
            <button
              disabled={busy}
              onClick={save}
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setEdit(false);
                setName(row.name);
                setNameAr(row.name_ar ?? "");
                setCount(row.people_count);
                setNamesEn(
                  row.people_names ?? Array.from({ length: row.people_count }, () => "")
                );
                setNamesAr(
                  row.people_names_ar ?? Array.from({ length: row.people_count }, () => "")
                );
                setRsvps(
                  row.people_rsvps ?? Array.from({ length: row.people_count }, () => null)
                );
              }}
              className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="inline-flex gap-2">
            <button
              onClick={() => setEdit(true)}
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:opacity-90"
            >
              Edit
            </button>
            <button
              onClick={copy}
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:opacity-90"
            >
              Copy link
            </button>
            <button
              onClick={del}
              className="px-3 py-1.5 text-xs rounded bg-rose-600 text-white hover:opacity-90"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ==================== UI bits ==================== */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function BadgePill({
  n,
  text,
  tone,
}: {
  n: number;
  text: string;
  tone: "emerald" | "rose" | "amber";
}) {
  const bg = { emerald: "bg-emerald-100", rose: "bg-rose-100", amber: "bg-amber-100" }[tone];
  const fg = {
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    amber: "text-amber-700",
  }[tone];
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded ${bg} ${fg}`}>
      <span className="font-medium tabular-nums">{n}</span>
      <span className="capitalize">{text}</span>
    </div>
  );
}
