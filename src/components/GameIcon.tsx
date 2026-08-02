export type GameCategory = "cartes" | "tuiles" | "plateau" | "des" | "exterieur";

const CREAM = "#FAF1DE";

export function GameIcon({
  category,
  size = 44,
}: {
  category: GameCategory;
  size?: number;
}) {
  const s = size / 44;

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, background: CREAM, borderRadius: 12 * s }}
    >
      <CategoryMark category={category} s={s} />
    </div>
  );
}

function CategoryMark({ category, s }: { category: GameCategory; s: number }) {
  switch (category) {
    case "cartes":
      return (
        <div style={{ position: "relative", width: 20 * s, height: 26 * s }}>
          <div
            style={{
              position: "absolute",
              top: -4 * s,
              left: -4 * s,
              width: 20 * s,
              height: 26 * s,
              background: CREAM,
              border: `${2 * s}px solid #2F6FB2`,
              borderRadius: 4 * s,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 20 * s,
              height: 26 * s,
              background: "#fff",
              border: `${2 * s}px solid #2F6FB2`,
              borderRadius: 4 * s,
            }}
          />
        </div>
      );
    case "tuiles":
      return (
        <div
          style={{
            width: 22 * s,
            height: 22 * s,
            background: "#8A9A6E",
            borderRadius: 5 * s,
            transform: "rotate(45deg)",
          }}
        />
      );
    case "plateau":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 12 * s, height: 12 * s, background: "#DE5A34", borderRadius: "50%" }} />
          <div
            style={{
              width: 20 * s,
              height: 12 * s,
              background: "#DE5A34",
              clipPath: "polygon(32% 0%, 68% 0%, 100% 100%, 0% 100%)",
              marginTop: -2 * s,
            }}
          />
        </div>
      );
    case "des":
      return (
        <div
          style={{
            width: 24 * s,
            height: 24 * s,
            background: "#E9A23B",
            borderRadius: 7 * s,
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gridTemplateRows: "repeat(3,1fr)",
            padding: 4 * s,
            boxSizing: "border-box",
          }}
        >
          {[
            [1, 1],
            [3, 1],
            [2, 2],
            [1, 3],
            [3, 3],
          ].map(([col, row]) => (
            <div
              key={`${col}-${row}`}
              style={{
                width: 4 * s,
                height: 4 * s,
                background: "#fff",
                borderRadius: "50%",
                gridColumn: col,
                gridRow: row,
              }}
            />
          ))}
        </div>
      );
    case "exterieur":
      // Boule de pétanque pleine + quille en transparence (option Y du
      // handoff design, OnjooUIKit.html section "Icône catégorie Extérieur").
      return (
        <div style={{ position: "relative", width: 30 * s, height: 30 * s }}>
          <svg
            width={18 * s}
            height={28 * s}
            viewBox="0 0 22 34"
            style={{ position: "absolute", bottom: 0, right: 0 }}
          >
            <path
              d="M11 1 C13 1 13.7 3 13.4 5 C13.1 6.6 12.2 7 12.2 8.6 C12.2 10.2 14.3 11 15.5 13.5 C17 16.7 17.2 20.4 16.6 24.1 C16.3 26.5 15.4 28.3 13.7 28.6 L8.3 28.6 C6.6 28.3 5.7 26.5 5.4 24.1 C4.8 20.4 5 16.7 6.5 13.5 C7.7 11 9.8 10.2 9.8 8.6 C9.8 7 8.9 6.6 8.6 5 C8.3 3 9 1 11 1 Z"
              fill="none"
              stroke="#5C3A73"
              strokeWidth={1.6 * s}
            />
            <line x1="4.6" y1="17" x2="17.4" y2="17" stroke="#5C3A73" strokeWidth={1.4 * s} />
          </svg>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 21 * s,
              height: 21 * s,
              background: "#5C3A73",
              borderRadius: "50%",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 4 * s,
                left: 4.5 * s,
                width: 7 * s,
                height: 5 * s,
                background: "#fff",
                borderRadius: "50%",
                opacity: 0.35,
              }}
            />
          </div>
        </div>
      );
  }
}
