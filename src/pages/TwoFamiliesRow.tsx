/* ==================== TwoFamiliesRow.tsx ==================== */
import logo from "../assets/logo.png";

export default function TwoFamiliesRow({
  rightTop,
  rightBottom,
  leftTop,
  leftBottom,
}: {
  rightTop: string;
  rightBottom: string;
  leftTop: string;
  leftBottom: string;
}) {
  return (
    <div
      className="
        rtl flex flex-row-reverse items-center justify-center
        gap-0
      "
    >
      {/* right */}
      <div className="text-center leading-tight">
        <div className="text-[13px] sm:text-[0.95rem] text-zinc-600 font-display m-0">
          {rightTop}
        </div>
        <div className="mt-2 text-[17px] sm:text-[1.35rem] md:text-[1.5rem] font-display text-ink leading-tight">
          {rightBottom}
        </div>
      </div>

      {/* center ornament — ultra tight (smaller logo + negative margin) */}
      <div aria-hidden className="shrink-0 -mx-1 sm:-mx-1.5">
        <img
          src={logo}
          alt=""
          className="w-10 h-10 sm:w-11 sm:h-11 object-contain opacity-90 block"
        />
      </div>

      {/* left */}
      <div className="text-center leading-tight">
        <div className="text-[13px] sm:text-[0.95rem] text-zinc-600 font-display m-0">
          {leftTop}
        </div>
        <div className="mt-2 text-[17px] sm:text-[1.35rem] md:text-[1.5rem] font-display text-ink leading-tight">
          {leftBottom}
        </div>
      </div>
    </div>
  );
}
