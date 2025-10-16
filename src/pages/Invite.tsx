// src/pages/Invite.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { slugify } from "../lib/slug";
import logo from "../assets/logo.png";
import TwoFamiliesRow from "./TwoFamiliesRow";
import FitText from "./FitText";
import { useMedia } from "./useMedia";
import FitToWidth from "./FitToWidth";
import Separator from "./Separator";
import ornament from "../assets/separator.png";



/* ========= معلومات الحفل ========= */
const EVENT = {
  city: "نادي الرتباء",
  venue: "قصر الأسطورة للاحتفالات",
  dateISO: "2025-11-16",
  host1: "المهندس محمد علي",
  host2:"المهندسة نغم",
  coordinators: [
    { name: "عافش مسفر القحطاني", phone: "0501024363" },
    { name: "خالد علي ثابت الشهري", phone: "0532238030" },
    { name: "عافش عائض القحطاني", phone: "0554666346" },
  ],
};

/* ========= الآية ========= */
const VERSE =
  "هُوَ الَّذِي خَلَقَكُم مِّن نَّفْسٍ وَاحِدَةٍ وَجَعَلَ مِنْهَا زَوْجَهَا لِيَسْكُنَ إِلَيْهَا";

type RSVP = "coming" | "not_coming" | "";
type Guest = {
  id: number;
  // EN
  name: string;
  people_count: number;
  people_names: string[] | null;
  people_rsvps: (("coming" | "not_coming") | null)[] | null;
  slug: string;
  alt_slug: string | null;
  // AR
  name_ar: string | null;
  people_names_ar: string[] | null;
  slug_ar: string | null;
  alt_slug_ar: string | null;
};

export default function Invite() {
  const { slug: rawParam } = useParams<{ slug: string }>();
  const slug = decodeURIComponent(rawParam ?? "");

  const [guest, setGuest] = useState<Guest | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error }: PostgrestSingleResponse<Guest> = await supabase
        .from("guests")
        .select(
          `
          id,name,people_count,people_names,people_rsvps,slug,alt_slug,
          name_ar,people_names_ar,slug_ar,alt_slug_ar
        `
        )
        .or(
          [
            `slug.eq.${slug}`,
            `alt_slug.eq.${slug}`,
            `slug_ar.eq.${slug}`,
            `alt_slug_ar.eq.${slug}`,
          ].join(",")
        )
        .single();

      if (error || !data) {
        setErr("لم يتم العثور على الضيف");
        return;
      }
      setGuest(data);

      const displayNames =
        (data.people_names_ar?.length ? data.people_names_ar : data.people_names) ??
        null;
      const count = displayNames?.length ?? data.people_count;

      setRsvps(
        Array.from({ length: count }).map((_, i) => {
          const v = data.people_rsvps?.[i];
          return v === "coming" || v === "not_coming" ? v : "";
        })
      );
    })();
  }, [slug]);

  // Names shown (Arabic first)
  const people =
    (guest?.people_names_ar && guest.people_names_ar.length > 0
      ? guest.people_names_ar
      : guest?.people_names) ??
    Array.from({ length: guest?.people_count ?? 0 }, (_, i) => `الزائر ${i + 1}`);

  const householdDisplay = guest?.name_ar?.trim() || guest?.name || "";

  const firstPerson = useMemo(
    () => people.find((n) => n.trim().length > 0)?.trim() ?? null,
    [people]
  );

  const shareSlug = useMemo(() => {
    // Prefer Arabic slugs for sharing
    const base =
      guest?.alt_slug_ar ??
      guest?.slug_ar ??
      guest?.alt_slug ??
      guest?.slug ??
      (firstPerson ? `${slugify(firstPerson)}-invitation` : "");
    return base;
  }, [guest, firstPerson]);

  const onChangeRSVP = (i: number, v: RSVP) =>
    setRsvps((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;

    setSaved(false);
    setErr(null);

    const normalized = rsvps.map((v) =>
      v === "coming" || v === "not_coming" ? v : null
    );

    const { error } = await supabase
      .from("guests")
      .update({ people_rsvps: normalized })
      .eq("id", guest.id);

    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
  };

  if (err) return <div className="p-6">{err}</div>;
  if (!guest) return <div className="flex justify-center p-6">جارِ التحميل…</div>;

  const baseUrl = window.location.origin;
  const link = `${baseUrl}/invite/${encodeURIComponent(shareSlug)}`;

  return (
    <div className="relative text-ink" dir="rtl">
      {/* background & watermark */}
      <div className="fixed inset-0 -z-10 bg-[#f6f6f6]" />

      <FixedTopVerse text={VERSE} />

      <main className="pt-[var(--verse-bar)] pb-0 ml-5 mr-5 ">
        <div className="relative bg-[#f6f6f6]/95 backdrop-blur  overflow-hidden">
          <div className="">
            {/* <div className="flex justify-center">
              <img src={logo} alt="الشعار" className="w-20 h-20 object-contain opacity-90" />
            </div> */}

           <header className="flex items-center justify-center gap-10 text-center">
  <div className="font-verse text-zinc-600 text-sm">
    يا باقة الافراح هلّي و ارفلي
  </div>
  <div className="font-verse text-zinc-600 text-sm">
    نغم لها و محمد بن الساحلي
  </div>
</header>
            {/* <div className="mt-0 text-center space-y-1">
              <div className="text-sm text-zinc-500">عائلة المرحوم ابراهيم الساحلي</div>
              <div className="text-4xl md:text-3xl font-bold tracking-wide font-display">{EVENT.host1}</div>
            </div>
            <div className="mt-0 text-center space-y-1">
              <div className="text-sm text-zinc-500">عائلة الاستاذ حسين مصطفى</div>
              <div className="text-4xl md:text-3xl font-bold tracking-wide font-display">{EVENT.host2}</div>
            </div> */}
            {/* <div className="mt-6 text-center text-zinc-700">
              وتناول طعام العشاء، وذلك بمشيئة الله تعالى مساء
            </div> */}

<section className="my-6 mt-8 mb-8  md:my-8">
  <TwoFamiliesRow
    leftTop="عائلة المرحوم ابراهيم الساحلي"
    leftBottom="المهندس محمدعلي"
    rightTop="عائلة  الاستاذ حسين مصطفى"
    rightBottom="المهندسة نغم"

  />
</section>
 <div className="text-zinc-500 text-[14px] mb-0 flex justify-center">يتشرفون بدعوتكم لحضور حفل زفاف ولديهما</div>

            <div className="mt-4 grid grid-cols-3 gap-0 items-center text-zinc-700 text-xs sm:text-sm">
  <Detail compact icon="calendar" title={EVENT.dateISO} lines={[]} />
  <Detail compact icon="pin" title={EVENT.city} lines={[]} />
  <Detail compact icon="none" title="Wish:70851633" lines={[]} />
</div>

            {/* <div className="mt-0 text-center space-y-1">
              <div className="text-sm text-zinc-500">الداعي</div>
              <div className="text-lg font-medium font-display">{EVENT.host1}</div>
            </div> */}
{/* <Separator opacity={0.22} color={"var(--taupe)"} width="14rem" height="1rem" /> */}
<div className="flex justify-center">
  <img src={ornament} alt="الشعار" className="w-20 h-20 object-contain opacity-50" />
</div>
            <div className="mt-[-18px] text-center">
              {/* <div className="text-zinc-500 text-sm mb-1">إلى كرام الضيوف من أسرة</div> */}
              <div className="text-[13px]  text-zinc-600 font-display">
                {householdDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* RSVP */}
        <section className="bg-[#f6f6f6]/95 backdrop-blur  mb-4 ml-35 mr-35">
          <h3 className="text-[13px]  mb-4 text-zinc-600 text-center">الرجاء تأكيد الحضور</h3>
          <div className="flex justify-center ml-5 mr-5">
          <form onSubmit={submit} className="space-y-4">
            {people.map((p, i) => (
              <div key={i} className="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                <div>
                  {/* <label className="block text-xs opacity-60 mb-1">الاسم</label> */}
                  <input
  value={p}
  readOnly
  className="text-[12px] bg-transparent  px-2 py-1 text-right focus:outline-none"
  style={{ backgroundColor: "transparent" }}
/>
                </div>
                <div className="">
                  {/* <label className="block text-xs opacity-60 mb-1">الرد</label> */}
                  <RadioTri value={rsvps[i] ?? ""} onChange={(v) => onChangeRSVP(i, v)} />
                </div>
              </div>
            ))}

            <div className="flex justify-center gap-3 pt-1">
              <button className="flex items-center rounded bg-[var(--button)] text-[var(--ivory)] text-[10px] px-2 py-1 disabled:opacity-50" disabled={saved}>
                {saved ? "تم الحفظ ✓" : "تحديث الرد"}
              </button>
              {saved && <span className="text-coffee-700">شكرًا—تم حفظ ردّكم. 🌸</span>}
            </div>

            {/* <div className="text-center text-xs opacity-60 pt-2">رابط المشاركة: {link}</div> */}
          </form>
          </div>
        </section>
      </main>

      <FixedBottomVerse text={VERSE} />
    </div>
  );
}

/* ===== Fixed verse bands: responsive, single line, center ===== */
// in Invite.tsx (replace your two components)

// in Invite.tsx (your two bars)
/* in Invite.tsx */

function FixedTopVerse({ text }: { text: string }) {
  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-screen z-40 bg-[#f6f6f6]/95  pointer-events-none select-none">
      <div className="flex items-center h-[var(--verse-bar)]">
        <FitToWidth
          text={text}
          minPx={10}
          maxPx={32}
          className="w-full text-center text-zinc-700/15 font-verse"
          dir="rtl"
        />
      </div>
    </div>
  );
}

function FixedBottomVerse({ text }: { text: string }) {
  return (
    <div className="sticky bottom-0 w-full z-40 bg-[#f6f6f6]/95 backdrop-blur-sm pointer-events-none select-none">
      <div className="flex items-center h-[var(--verse-bar)]">
        <FitToWidth
          text={text}
          minPx={12}
          maxPx={32}
          className="w-full text-center text-zinc-700/15 font-verse"
          dir="rtl"
        />
      </div>
    </div>
  );
}







/* ==================== Display helpers ==================== */
function Detail({
  icon,
  title,
  lines,
  children,
  compact = false,
}: {
  icon?: "calendar" | "pin" | "users" | "none";
  title: string;
  lines: string[];
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "px-0 text-center min-w-0" : "px-1 py-0 text-center min-w-0"}>
      <div
        className={[
          "flex items-center justify-center whitespace-nowrap",
          compact ? "gap-1 mb-0" : "gap-1 sm:gap-2 mb-1",
        ].join(" ")}
      >
        {icon && icon !== "none" ? (
          <Icon
            name={icon}
            className={compact ? "w-3.5 h-3.5 text-primary shrink-0" : "w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0"}
          />
        ) : (
          <span className={compact ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 sm:w-5 sm:h-5 shrink-0"} />
        )}
        <div className={compact ? "font-medium truncate text-[11px]" : "font-medium truncate"}>{title}</div>
      </div>

      {children ? (
        <div className={compact ? "text-[10px] text-zinc-700 leading-tight" : "text-[11px] sm:text-sm text-zinc-700"}>
          {children}
        </div>
      ) : (
        <div className={compact ? "text-[10px] text-zinc-700 space-y-0 leading-tight" : "text-[11px] sm:text-sm text-zinc-700 space-y-0.5"}>
          {lines.map((l, i) => (
            <div key={i} className="truncate">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}


function Icon({
  name,
  className,
}: {
  name: "calendar" | "pin" | "users" | "none"; // <-- include "none"
  className?: string;
}) {
  if (name === "none") return null;
  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s7-5.33 7-12a7 7 0 1 0-14 0c0 6.67 7 12 7 12z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  // users
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="3.2" />
      <path d="M2.8 18.4a6 6 0 0 1 10.4 0" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M14.5 18.5a4.8 4.8 0 0 1 6.7 0" />
    </svg>
  );
}


/* ==================== RSVP ==================== */
function RadioTri({ value, onChange }: { value: RSVP; onChange: (v: RSVP) => void }) {
  const Opt = ({ v, label }: { v: RSVP; label: string }) => {
    const active = value === v || (v === "" && value === "");
    const tone =
      v === "coming"
        ? "ring-1 bg-[var(--beige)]/25 text-[var(--sand)] ring-[var(--beige)]/50"
        : v === "not_coming"
        ? "ring-1 bg-[var(--taupe)]/15 text-[var(--coffee)] ring-[var(--taupe)]/50"
        : "ring-1 bg-[var(--ivory)]/70 text-[var(--taupe)] ring-[var(--taupe)]/30";

    return (
      <button
        type="button"
        onClick={() => onChange(v)}
        className={[
  "px-4 py-2 rounded-sm font-medium transition",
  "text-[10px] md:text-lg",   // ⬅️ was text-sm
  active ? tone : "bg-[#f6f6f6] text-[var(--taupe)] hover:bg-[var(--ivory)]/60 border border-[var(--taupe)]/20"
].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    // no-wrap + horizontal scroll on tiny screens
    <div className="flex flex-nowrap gap-1 whitespace-nowrap overflow-x-auto no-scrollbar pr-0">
      <Opt v="coming" label="سيحضر" />
      <Opt v="not_coming" label="لن يحضر" />
      <Opt v="" label="لم يقرر" />
    </div>
  );
}

