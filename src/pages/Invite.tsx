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
import wishLogo from "../assets/whishmoney-o.png";



/* ========= معلومات الحفل ========= */
const EVENT = {
  city: "الفيّاضية-نادي الرتباء",
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

      {/* <FixedTopVerse text={VERSE} /> */}
      <div className="max-w-[26rem] mx-auto">
      <FitToWidth text="بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ" minPx={9} maxPx={10}  className="w-full text-center text-[13px] font-verse text-zinc-600" dir="rtl" />
<FitToWidth text={VERSE} minPx={9} maxPx={10} className="w-full text-center text-[13px] font-verse text-zinc-600 " dir="rtl" />
<FitToWidth text="صَدَقَ اللَّهُ العَظِيمُ" minPx={9} maxPx={10} className="w-full sidePaddingPx={16} text-[13px] text-center font-verse text-zinc-600" dir="rtl" />
</div>

      <main className="mt-3 pb-0 ml-5 mr-5 ">
        <div className="relative bg-[#f6f6f6]/95 backdrop-blur  overflow-hidden  animate-fade-in-up">
          <div className="">
            {/* <div className="flex justify-center">
              <img src={logo} alt="الشعار" className="w-20 h-20 object-contain opacity-90" />
            </div> */}

           <header className="flex items-center justify-center gap-5 text-center">
  <div className="font-verse text-zinc-600 text-sm">
    يا باقةَ الأفراحِ هَلِّي وارفُلِي
  </div>
  <div className="font-verse text-zinc-600 text-sm">
    نغمٌ لها ومحمدٌ بْنِ السَّاحِلِي
  </div>
</header>

           <header className="flex items-center justify-center mt-8 gap-5 text-center">
  <div className="font-display text-zinc-600 text-sm">
   عائلة المرحوم ابراهيم الساحلي
  </div>
  <div className="font-display text-zinc-600 text-sm">
    عائلة  الاستاذ حسين مصطفى
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
<div className="text-zinc-500 mt-1 text-[14px] mb-0 flex justify-center">يتشرفون بدعوتكم لحضور حفل زفاف ولديهما</div>

<section className="my-6 mt-0 mb-8  md:my-8">
  <TwoFamiliesRow
    leftTop="عائلة المرحوم ابراهيم الساحلي"
    leftBottom="المهندس محمدعلي"
    rightTop="عائلة  الاستاذ حسين مصطفى"
    rightBottom="المهندسة نغم"

  />
</section>
 {/* <div className="text-zinc-500 text-[14px] mb-0 flex justify-center">يتشرفون بدعوتكم لحضور حفل زفاف ولديهما</div> */}

         {/* one straight line */}

<div className="mt-4 flex items-center justify-between gap-4 text-zinc-700 text-xs sm:text-sm leading-none">
  <div className="shrink-0 min-w-0 ">
    <Detail compact icon="calendar" title={EVENT.dateISO} lines={[]} />
  </div>
<div className="shrink-0 min-w-0">
              <Detail compact icon="clock" title="06:00 م" lines={[]} />
            </div>
  <div className="shrink-0 min-w-0  leading-none">
    <Detail
      compact
      icon="pin"
      title="الفيّاضية-نادي الرتباء"
      lines={[]}
      href="https://www.google.com/maps/place/RHX2%2B7V3+Nadi+al+Rotabaa+(+%D9%86%D8%A7%D8%AF%D9%8A+%D8%A7%D9%84%D8%B1%D8%AA%D8%A8%D8%A7%D8%A1+%D8%A7%D9%84%D9%81%D9%8A%D8%A7%D8%B6%D9%8A%D8%A9+),+Baabda%E2%80%AD/data=!4m2!3m1!1s0x151f17fbd2c5be35:0xf6321bb71c058bf2!17m2!4m1!1e3!18m1!1e1"
      titleClassName="leading-normal "
    />
  </div>


  {/* <div className="shrink-0 min-w-0 ">
    <Detail compact icon="none" title="" lines={[]}>
    <div className="flex items-center gap-1 leading-none whitespace-nowrap">
  <img src={wishLogo} alt="Whish Money" className="block h-4 w-auto" />
  <span className="font-medium tracking-wide tabular-nums leading-none hover-wink hover:opacity-90 transition">
    70851633
  </span>
</div>
    </Detail>
  </div> */}
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
        <section className="bg-[#f6f6f6]/95 backdrop-blur mb-6">
  <h3 className="text-[13px] mb-3 text-zinc-600 text-center">الرجاء تأكيد الحضور</h3>

  {/* keep the whole block centered with side margins */}
  <div className="mx-auto max-w-2xl px-4">
    <form onSubmit={submit} className="space-y-2">
      {people.map((p, i) => (
        <div
          key={i}
          className="
            flex items-center justify-between gap-2
            py-1.5 border-b border-zinc-200/60 last:border-0
          "
        >
          {/* Name on the right (RTL) */}
          <input
            value={p}
            readOnly
            className="
              bg-transparent focus:outline-none
              text-[12px] text-right
              w-[18ch] sm:w-[22ch] md:w-[26ch]
              truncate
            "
          />

          {/* Buttons on the left (RTL), compact */}
          <RadioTri
            value={rsvps[i] ?? ""}
            onChange={(v) => onChangeRSVP(i, v)}
            size="sm"
          />
        </div>
      ))}

      <div className="flex justify-center gap-3 pt-2">
        <button
          className="flex items-center rounded bg-[var(--button)] text-[var(--ivory)] text-[11px] px-3 py-1.5 disabled:opacity-50"
          disabled={saved}
        >
          {saved ? "تم الحفظ ✓" : "تحديث الرد"}
        </button>
        {saved && <span className="text-coffee-700 text-[12px]">شكرًا—تم حفظ ردّكم. 🌸</span>}
      </div>
    </form>
  </div>
</section>
<div className="text-zinc-500 mt-4 text-[12px] mb-0 flex justify-center items-center gap-1" dir="rtl">
  <span>الهدايا تُرسَل على الرقم:</span>
  <GiftInline logoSrc={wishLogo} number="70851633" />
</div>
<div className="text-zinc-500 mt-4 text-[14px] mb-0 flex justify-center">وَلْتَعْمُرْ دِيَارُكُم بِسَنَا الأَفْرَاحِ وَالمَسَرَّاتِ</div>


      </main>

      {/* <FixedBottomVerse text={VERSE} /> */}
    </div>
  );
}

/* ===== Fixed verse bands: responsive, single line, center ===== */
// in Invite.tsx (replace your two components)

// in Invite.tsx (your two bars)
/* in Invite.tsx */

function FixedTopVerse({ text }: { text: string }) {
  return (
    <div className="fixed top-0  left-1/2 -translate-x-1/2 w-screen z-40 bg-[#f6f6f6]/95  pointer-events-none select-none">
      <div className="flex items-center h-[var(--verse-bar)]">
        <FitToWidth
          text={text}
          minPx={10}
          maxPx={42}
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
/* ==================== Display helpers ==================== */
function Detail({
  icon,
  title,
  lines,
  children,
  compact = false,
  href,
  titleClassName = "",
}: {
  icon?: "calendar" | "pin" | "users" | "clock" | "none"; // ← includes "clock"
  title: string;
  lines: string[];
  children?: React.ReactNode;
  compact?: boolean;
  href?: string;
  titleClassName?: string;
}) {
  const hasIcon = !!icon && icon !== "none";

  const row = (
    <div
      className={[
        "inline-flex items-center whitespace-nowrap",
        compact ? "gap-1" : "gap-2",
      ].join(" ")}
    >
      {hasIcon && (
        <Icon
          name={icon as Exclude<typeof icon, "none">}
          className={(compact ? "h-4 w-4" : "h-5 w-5") + " text-primary shrink-0 block"}
        />
      )}

      <span
        className={[
          "font-medium truncate",
          compact ? "text-[11px]" : "",
          "leading-[1.2]",
          titleClassName,
        ].join(" ")}
      >
        {title}
      </span>
    </div>
  );

  const wrapperCls = compact ? "px-0 text-center min-w-0" : "px-1 py-0 text-center min-w-0";

  return (
    <div className={wrapperCls}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 focus:opacity-80 outline-none"
          title="افتح الموقع على الخريطة"
        >
          {row}
        </a>
      ) : (
        row
      )}

      {children ? (
        <div className={compact ? "text-[10px] text-zinc-700 leading-tight" : "text-[11px] sm:text-sm text-zinc-700"}>
          {children}
        </div>
      ) : lines.length > 0 ? (
        <div className={compact ? "text-[10px] text-zinc-700 space-y-0 leading-tight" : "text-[11px] sm:text-sm text-zinc-700 space-y-0.5"}>
          {lines.map((l, i) => (
            <div key={i} className="truncate">
              {l}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ==================== Icon ==================== */
function Icon({
  name,
  className,
}: {
  name: "calendar" | "pin" | "users" | "clock" | "none";
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

  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
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
function RadioTri({
  value,
  onChange,
  size = "md",
}: {
  value: RSVP;
  onChange: (v: RSVP) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-3 py-1" : "px-4 py-2";
  const text = size === "sm" ? "text-[12px]" : "text-[14px]";
  const gap  = size === "sm" ? "gap-1.5" : "gap-2";

  const Btn = ({ v, label }: { v: RSVP; label: string }) => {
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
          "rounded-sm font-medium transition leading-none",
          pad,
          text,
          active
            ? tone
            : "bg-[#f6f6f6] text-[var(--taupe)] hover:bg-[var(--ivory)]/60 border border-[var(--taupe)]/20",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={["flex flex-nowrap items-center", gap, "whitespace-nowrap"].join(" ")}>
      <Btn v="coming" label="سيحضر" />
      <Btn v="not_coming" label="لن يحضر" />
      <Btn v="" label="لم يقرر" />
    </div>
  );
}

function QuranHeader() {
  return (
    <div className="mt-3 mb-4 text-center space-y-1" dir="rtl">
      <div className="font-verse text-zinc-600 text-sm">
        بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ
      </div>

      <div className="font-verse text-zinc-600 text-sm">
        {VERSE}
      </div>

      <div className="font-verse text-zinc-600 text-sm">
        صَدَقَ اللَّهُ العَظِيمُ
      </div>
    </div>
  );
}
function GiftInline({
  logoSrc,
  number,
  className = "",
}: {
  logoSrc: string;
  number: string;
  className?: string;
}) {
  return (
    <span className={["inline-flex items-center gap-1 align-middle whitespace-nowrap", className].join(" ")}>
      <img src={logoSrc} alt="" className="block h-4 w-auto" loading="lazy" />
      <span className="font-medium tracking-wide tabular-nums leading-none hover:opacity-90 transition">
        {number}
      </span>
    </span>
  );
}
