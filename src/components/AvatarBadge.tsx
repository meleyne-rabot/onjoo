import type { AvatarShape } from "@/lib/avatar";

export function AvatarBadge({
  color,
  shape,
  size = 48,
}: {
  color: string;
  shape: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: `${color}22` }}
    >
      <ShapeIcon
        shape={shape as AvatarShape}
        color={color}
        size={size * 0.55}
      />
    </div>
  );
}

function ShapeIcon({
  shape,
  color,
  size,
}: {
  shape: AvatarShape;
  color: string;
  size: number;
}) {
  switch (shape) {
    case "circle":
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "9999px",
            backgroundColor: color,
          }}
        />
      );
    case "square":
      return (
        <div style={{ width: size, height: size, backgroundColor: color }} />
      );
    case "diamond":
      return (
        <div
          style={{
            width: size * 0.8,
            height: size * 0.8,
            backgroundColor: color,
            transform: "rotate(45deg)",
          }}
        />
      );
    case "triangle":
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
          }}
        />
      );
    case "star":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.9l-6.18 3.12L7 13.14 2 8.27l6.91-1.01L12 1z" />
        </svg>
      );
    case "cross":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
        </svg>
      );
  }
}
