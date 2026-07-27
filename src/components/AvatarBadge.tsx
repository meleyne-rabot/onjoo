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
      <ShapeIcon shape={shape as AvatarShape} color={color} size={size * 0.62} />
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
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill={color} />
          <ellipse cx="38" cy="34" rx="12" ry="8" fill="#fff" opacity="0.22" />
        </svg>
      );
    case "square":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <rect x="13" y="13" width="74" height="74" rx="20" fill={color} />
          <rect x="24" y="22" width="34" height="10" rx="5" fill="#fff" opacity="0.22" />
        </svg>
      );
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <path
            d="M50 11 C52 11 54 12 55 14 L87 78 C90 84 86 90 79 90 H21 C14 90 10 84 13 78 L45 14 C46 12 48 11 50 11 Z"
            fill={color}
          />
          <ellipse
            cx="42"
            cy="46"
            rx="8"
            ry="6"
            fill="#fff"
            opacity="0.2"
            transform="rotate(-10 42 46)"
          />
        </svg>
      );
    case "star":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <path
            d="M50 6 C52 6 54 7 55 9 L64 30 C65 32 67 33 69 33 L92 36 C97 37 99 43 95 47 L79 63 C77 65 76 67 77 70 L82 93 C83 98 78 102 74 99 L53 88 C51 87 49 87 47 88 L26 99 C22 102 17 98 18 93 L23 70 C24 67 23 65 21 63 L5 47 C1 43 3 37 8 36 L31 33 C33 33 35 32 36 30 L45 9 C46 7 48 6 50 6 Z"
            fill={color}
          />
          <ellipse cx="42" cy="38" rx="9" ry="6" fill="#fff" opacity="0.2" />
        </svg>
      );
    case "clover":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <path
            d="M50 13 C61 13 69 21 69 32 C69 36 68 40 65 43 C74 41 82 47 82 57 C82 68 74 76 63 76 C58 76 54 74 51 71 C53 79 57 84 64 86 H36 C43 84 47 79 49 71 C46 74 42 76 37 76 C26 76 18 68 18 57 C18 47 26 41 35 43 C32 40 31 36 31 32 C31 21 39 13 50 13 Z"
            fill={color}
          />
          <ellipse cx="42" cy="28" rx="7" ry="5" fill="#fff" opacity="0.22" />
        </svg>
      );
    case "heart":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <path
            d="M50 88 C50 88 12 62 12 36 C12 20 24 10 37 10 C44 10 50 14 50 22 C50 14 56 10 63 10 C76 10 88 20 88 36 C88 62 50 88 50 88 Z"
            fill={color}
          />
          <ellipse cx="34" cy="30" rx="9" ry="6" fill="#fff" opacity="0.22" />
        </svg>
      );
    // Compat rétroactive : formes retirées du sélecteur mais peut-être
    // encore stockées sur d'anciennes fiches joueur.
    default:
      return (
        <div
          style={{
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: "9999px",
            backgroundColor: color,
          }}
        />
      );
  }
}
