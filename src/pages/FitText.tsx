// src/components/FitText.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  basePx?: number;
  className?: string;
  dir?: "rtl" | "ltr";
};

export default function FitText({
  text,
  basePx = 56,
  className = "",
  dir = "rtl",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current!;
    const span = spanRef.current!;
    if (!el || !span) return;

    const measure = () => {
      span.style.transform = "scale(1)";
      const cw = el.clientWidth;                       // parent width
      const sw = span.scrollWidth;                     // natural text width
      const scaleW = cw > 0 ? cw / sw : 1;

      const ch = el.clientHeight;                      // parent height
      const sh = span.getBoundingClientRect().height || basePx;
      const scaleH = ch > 0 ? ch / sh : 1;

      setScale(Math.min(1, scaleW, scaleH));          // shrink-only
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(span);
    measure();
    return () => ro.disconnect();
  }, [text, basePx]);

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-none overflow-hidden ${className}`}  // ← w-full
      dir={dir}
    >
      <span
        ref={spanRef}
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          transformOrigin: "center",
          transform: `scale(${scale})`,
          fontSize: `${basePx}px`,
          lineHeight: 1,
        }}
      >
        {text}
      </span>
    </div>
  );
}
