// Formation officielle de départ (source : Wikipédia + fédération, croisées) :
// rang 1 (le plus proche de la ligne de lancer) 1-2, rang 2 3-10-4,
// rang 3 5-11-12-6, rang 4 (le plus loin) 7-9-8. 3 à 4 m jusqu'au rang 1.
const ROWS_FRONT_TO_BACK = [
  [1, 2],
  [3, 10, 4],
  [5, 11, 12, 6],
  [7, 9, 8],
];

export function MolkkySetupDiagram() {
  const backToFront = [...ROWS_FRONT_TO_BACK].reverse();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-[#FAF1DE] p-4">
      <div className="flex flex-col items-center gap-2">
        {backToFront.map((row, i) => (
          <div key={i} className="flex gap-2">
            {row.map((n) => (
              <div
                key={n}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-onjoo-orange-500 font-fredoka text-sm font-bold text-white"
              >
                {n}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="h-px w-full max-w-[180px] bg-[#ddd]" />
      <p className="text-center font-quicksand text-xs text-[#777]">
        Ligne de lancer, à 3-4 m de la quille n°1-2 (le rang le plus proche).
      </p>
    </div>
  );
}
