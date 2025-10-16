import { useEffect, useRef } from "react";

type Props = {
  text: string;
  minPx?: number;   // smallest allowed size on very narrow phones
  maxPx?: number;   // upper bound for tablets/desktop
  className?: string;
  dir?: "rtl" | "ltr";
  sidePaddingPx?: number; // keeps some breathing room
};

export default function FitToWidth({
  text,
  minPx = 12,
  maxPx = 36,
  className = "",
  dir = "rtl",
  sidePaddingPx = 8,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const span = spanRef.current!;
    if (!host || !span) return;

    const fit = () => {
      const W = host.clientWidth - sidePaddingPx * 2;   // usable width
      if (W <= 0) return;

      let lo = minPx, hi = maxPx;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        span.style.fontSize = `${mid}px`;
        const sw = span.scrollWidth;
        if (sw > W) hi = mid; else lo = mid;
      }
      span.style.fontSize = `${lo}px`;
      span.style.paddingLeft = span.style.paddingRight = `${sidePaddingPx}px`;
    };

    const ro = new ResizeObserver(fit);
    ro.observe(host);
    ro.observe(span);
    fit();
    return () => ro.disconnect();
  }, [text, minPx, maxPx, sidePaddingPx]);

  return (
    <div ref={hostRef} className={`w-full overflow-hidden ${className}`} dir={dir}>
      <span style={{ whiteSpace: "nowrap", lineHeight: 1 }}>{text}</span>
    </div>
  );
}
