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
      // Placeholder en attendant les vraies icônes "Extérieur" — une
      // feuille toute simple, cohérente avec le style aplat des autres.
      return (
        <div
          style={{
            width: 22 * s,
            height: 22 * s,
            background: "#5C3A73",
            borderRadius: "0% 50% 50% 50%",
            transform: "rotate(45deg)",
          }}
        />
      );
  }
}
