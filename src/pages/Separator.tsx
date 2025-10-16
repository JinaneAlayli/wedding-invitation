import ornament from "../assets/separator.png";

/** Centered ornamental line with opacity + optional tint (uses CSS mask) */
export default function Separator({ opacity = 0.25, color = "var(--coffee)", width = "16rem", height = "1.25rem" }) {
  return (
    <div className="my-4 flex justify-center">
      <div
        style={{
          width,
          height,
          backgroundColor: color,
          opacity,
          WebkitMask: `url(${ornament}) center / contain no-repeat`,
          mask: `url(${ornament}) center / contain no-repeat`,
        }}
      />
    </div>
  );
}

