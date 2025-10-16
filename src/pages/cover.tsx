// src/pages/cover.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import logo from "../assets/logo.png";

const TARGET_ISO = "2025-11-16T20:00:00";

type T = { days: number; hours: number; minutes: number; seconds: number };
const pad2 = (n: number) => n.toString().padStart(2, "0");
function diff(from: number, to: number): T {
  let d = Math.max(0, Math.floor((to - from) / 1000));
  const days = Math.floor(d / 86400); d -= days * 86400;
  const hours = Math.floor(d / 3600); d -= hours * 3600;
  const minutes = Math.floor(d / 60); d -= minutes * 60;
  const seconds = d;
  return { days, hours, minutes, seconds };
}

export default function Cover() {
  const { slug } = useParams<{ slug: string }>();
  const target = useMemo(() => new Date(TARGET_ISO).getTime(), []);
  const [now, setNow] = useState(Date.now());
  const d = diff(now, target);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative min-h-[100svh] w-full overflow-hidden flex justify-center items-start bg-[#F6F6F6] pt-6 sm:pt-0"
      dir="rtl"
    >
      <div className="text-center px-6 w-full max-w-5xl">
        {/* Logo pinned near top */}
        <img
          src={logo}
          alt="الشعار"
          className="mx-auto mt-0 mb-10 h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] object-contain opacity-90"
        />

        {/* Countdown — closer to button */}
        <div className="flex flex-wrap justify-center items-end gap-5 sm:gap-8 text-[var(--coffee)] mb-8">
          <CountdownCard value={d.seconds} label="ثوانٍ" />
          <CountdownCard value={d.minutes} label="دقائق" />
          <CountdownCard value={d.hours}   label="ساعات" />
          <CountdownCard value={d.days}    label="أيام" />
         
        </div>

        {/* Button with arrow only */}
        <div className="mt-4 text-center">
  <Link
    to={`/invite/${encodeURIComponent(slug ?? "")}/rsvp`}
    className="inline-flex items-center justify-center text-[var(--coffee)] hover:scale-110 active:scale-95 transition-transform"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </Link>
</div>
      </div>

      {/* Whole page clickable fallback */}
      <Link
        to={`/invite/${encodeURIComponent(slug ?? "")}/rsvp`}
        className="absolute inset-0"
        aria-label="ادخل إلى الدعوة"
      />
    </div>
  );
}

/* ===== Animated, minimal counter ===== */
function CountdownCard({ value, label }: { value: number; label: string }) {
  const [pop, setPop] = useState(false);

  useEffect(() => {
    setPop(true);
    const t = setTimeout(() => setPop(false), 180);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center leading-none">
      <div
        className={[
          "tabular-nums font-semibold text-[26px] sm:text-[34px] md:text-[38px] text-[var(--coffee)]",
          "transition-transform duration-200 will-change-transform",
          pop ? "scale-110" : "scale-100",
        ].join(" ")}
      >
        {pad2(value)}
      </div>
      <div className="mt-1 text-[12px] sm:text-[14px] text-[var(--taupe)]">
        {label}
      </div>
    </div>
  );
}
