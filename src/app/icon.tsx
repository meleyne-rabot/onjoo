import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

async function loadFredokaBold() {
  const cssResponse = await fetch(
    "https://fonts.googleapis.com/css2?family=Fredoka:wght@700",
  );
  const css = await cssResponse.text();
  const fontUrl = css.match(/src: url\((.+?)\) format\('(?:truetype|woff2)'\)/)?.[1];

  if (!fontUrl) {
    throw new Error("Impossible de trouver l'URL de la police Fredoka");
  }

  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
}

export default async function Icon() {
  const fredokaBold = await loadFredokaBold();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FAF1DE",
          borderRadius: 116,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: 122,
            color: "#163D2E",
            lineHeight: 1,
          }}
        >
          On
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              display: "flex",
              fontFamily: "Fredoka",
              fontWeight: 700,
              fontSize: 169,
              color: "#E9A23B",
              lineHeight: 1,
              marginTop: -23,
            }}
          >
            j
          </span>
          <div
            style={{
              width: 128,
              height: 128,
              background: "#DE5A34",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", width: 38, height: 38, background: "#fff", borderRadius: "50%" }} />
              <div
                style={{
                  display: "flex",
                  width: 61,
                  height: 35,
                  background: "#fff",
                  clipPath: "polygon(32% 0%, 68% 0%, 100% 100%, 0% 100%)",
                  marginTop: -6,
                }}
              />
            </div>
          </div>
          <div
            style={{
              position: "relative",
              width: 128,
              height: 128,
              background: "#2F6FB2",
              borderRadius: 47,
              display: "flex",
            }}
          >
            <div style={{ display: "flex", position: "absolute", top: 20, left: 20, width: 23, height: 23, borderRadius: "50%", background: "#fff" }} />
            <div style={{ display: "flex", position: "absolute", top: 52.5, left: 52.5, width: 23, height: 23, borderRadius: "50%", background: "#fff" }} />
            <div style={{ display: "flex", position: "absolute", top: 85, left: 85, width: 23, height: 23, borderRadius: "50%", background: "#fff" }} />
          </div>
        </div>
        <svg width={163} height={76} viewBox="0 0 100 42" style={{ marginTop: 6, marginLeft: 70 }}>
          <path d="M4 10 Q50 42 96 2" stroke="#163D2E" strokeWidth={9} fill="none" strokeLinecap="round" />
        </svg>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Fredoka",
          data: fredokaBold,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
