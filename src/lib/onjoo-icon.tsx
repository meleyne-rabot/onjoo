// Générateur partagé pour l'icône Onjoo (favicon + PWA + Apple touch icon),
// fidèle au mockup "3a" du handoff design, paramétré par taille de canevas
// pour rester net à n'importe quelle résolution.

export async function loadFredokaBold(): Promise<ArrayBuffer> {
  const cssResponse = await fetch(
    "https://fonts.googleapis.com/css2?family=Fredoka:wght@700",
  );
  const css = await cssResponse.text();
  const fontUrl = css.match(
    /src: url\((.+?)\) format\('(?:truetype|woff2)'\)/,
  )?.[1];

  if (!fontUrl) {
    throw new Error("Impossible de trouver l'URL de la police Fredoka");
  }

  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
}

// Toutes les valeurs ci-dessous sont calibrées pour un canevas de 512px,
// puis mises à l'échelle (s) pour toute autre taille demandée.
export function OnjooIconMark({ canvasSize }: { canvasSize: number }) {
  const s = canvasSize / 512;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FAF1DE",
        borderRadius: 116 * s,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18 * s,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Fredoka",
          fontWeight: 700,
          fontSize: 122 * s,
          color: "#163D2E",
          lineHeight: 1,
        }}
      >
        On
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * s }}>
        <span
          style={{
            display: "flex",
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: 169 * s,
            color: "#E9A23B",
            lineHeight: 1,
            marginTop: -23 * s,
          }}
        >
          j
        </span>
        <div
          style={{
            width: 128 * s,
            height: 128 * s,
            background: "#DE5A34",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 38 * s,
                height: 38 * s,
                background: "#fff",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                display: "flex",
                width: 61 * s,
                height: 35 * s,
                background: "#fff",
                clipPath: "polygon(32% 0%, 68% 0%, 100% 100%, 0% 100%)",
                marginTop: -6 * s,
              }}
            />
          </div>
        </div>
        <div
          style={{
            position: "relative",
            width: 128 * s,
            height: 128 * s,
            background: "#2F6FB2",
            borderRadius: 47 * s,
            display: "flex",
          }}
        >
          <div style={{ display: "flex", position: "absolute", top: 20 * s, left: 20 * s, width: 23 * s, height: 23 * s, borderRadius: "50%", background: "#fff" }} />
          <div style={{ display: "flex", position: "absolute", top: 52.5 * s, left: 52.5 * s, width: 23 * s, height: 23 * s, borderRadius: "50%", background: "#fff" }} />
          <div style={{ display: "flex", position: "absolute", top: 85 * s, left: 85 * s, width: 23 * s, height: 23 * s, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>
      <svg width={163 * s} height={76 * s} viewBox="0 0 100 42" style={{ marginTop: 6 * s, marginLeft: 70 * s }}>
        <path d="M4 10 Q50 42 96 2" stroke="#163D2E" strokeWidth={9} fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
