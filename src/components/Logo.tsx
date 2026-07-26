const GREEN = "#163D2E";
const ORANGE = "#E9A23B";
const RED = "#DE5A34";
const BLUE = "#2F6FB2";
const CREAM = "#FAF1DE";

type LogoProps = {
  variant?: "icon" | "horizontal" | "nav" | "compact";
  theme?: "light" | "dark";
  className?: string;
};

export function Logo({ variant = "horizontal", theme = "light", className }: LogoProps) {
  if (variant === "icon") return <IconMark className={className} />;
  if (variant === "nav") return <NavMark className={className} />;
  if (variant === "compact") return <CompactMark className={className} />;
  return <HorizontalMark theme={theme} className={className} />;
}

// Icône pleine (mockup 3a) — 176x176
function IconMark({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 176,
        height: 176,
        background: CREAM,
        borderRadius: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-fredoka)",
          fontWeight: 700,
          fontSize: 42,
          color: GREEN,
          lineHeight: 1,
        }}
      >
        On
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-fredoka)",
            fontWeight: 700,
            fontSize: 58,
            color: ORANGE,
            lineHeight: 1,
            marginTop: -8,
          }}
        >
          j
        </span>
        <div
          style={{
            width: 44,
            height: 44,
            background: RED,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 13, height: 13, background: "#fff", borderRadius: "50%" }} />
            <div
              style={{
                width: 21,
                height: 12,
                background: "#fff",
                clipPath: "polygon(32% 0%, 68% 0%, 100% 100%, 0% 100%)",
                marginTop: -2,
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            background: BLUE,
            borderRadius: 16,
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gridTemplateRows: "repeat(3,1fr)",
            padding: 7,
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", gridColumn: 1, gridRow: 1 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", gridColumn: 2, gridRow: 2 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", gridColumn: 3, gridRow: 3 }} />
        </div>
      </div>
      <svg width={56} height={26} viewBox="0 0 100 42" style={{ marginTop: 2, marginLeft: 24, overflow: "visible" }}>
        <path d="M4 10 Q50 42 96 2" stroke={GREEN} strokeWidth={9} fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Logotype horizontal (mockups 3b/3c) — icône 72px + wordmark
function HorizontalMark({
  theme,
  className,
}: {
  theme: "light" | "dark";
  className?: string;
}) {
  const wordmarkColor = theme === "dark" ? "#fff" : GREEN;

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 72,
          height: 72,
          background: CREAM,
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-fredoka)",
            fontWeight: 700,
            fontSize: 17,
            color: GREEN,
            lineHeight: 1,
          }}
        >
          On
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-fredoka)",
              fontWeight: 700,
              fontSize: 24,
              color: ORANGE,
              lineHeight: 1,
              marginTop: -3,
            }}
          >
            j
          </span>
          <div style={{ width: 18, height: 18, background: RED, borderRadius: "50%" }} />
          <div style={{ width: 18, height: 18, background: BLUE, borderRadius: 6 }} />
        </div>
        <svg width={23} height={11} viewBox="0 0 100 42" style={{ marginTop: 1, marginLeft: 10, overflow: "visible" }}>
          <path d="M4 10 Q50 42 96 2" stroke={GREEN} strokeWidth={14} fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "var(--font-fredoka)",
          fontWeight: 700,
          fontSize: 44,
          color: wordmarkColor,
        }}
      >
        Onjoo
      </span>
    </div>
  );
}

// Variante barre de navigation — 40px, sans sourire
function NavMark({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          background: CREAM,
          borderRadius: 11,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-fredoka)",
            fontWeight: 700,
            fontSize: 10,
            color: GREEN,
            lineHeight: 1,
          }}
        >
          On
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-fredoka)",
              fontWeight: 700,
              fontSize: 13,
              color: ORANGE,
              lineHeight: 1,
              marginTop: -2,
            }}
          >
            j
          </span>
          <div style={{ width: 10, height: 10, background: RED, borderRadius: "50%" }} />
          <div style={{ width: 10, height: 10, background: BLUE, borderRadius: 3 }} />
        </div>
      </div>
      <span style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 20, color: GREEN }}>
        Onjoo
      </span>
    </div>
  );
}

// Format compact (mockup 3d) — juste "O" + wordmark
function CompactMark({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          background: CREAM,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 15, color: GREEN }}>
          O
        </span>
      </div>
      <span style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 26, color: GREEN }}>
        Onjoo
      </span>
    </div>
  );
}
