import { ImageResponse } from "next/og";

export const alt = "Valle Volcanes Propiedades · Puerto Varas, lagos y volcanes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f1ea",
          padding: "72px 84px",
        }}
      >
        <svg width="1032" height="250" viewBox="0 0 1032 250">
          {/* Volcán: cono con cumbre truncada y nieve */}
          <polygon points="560,250 700,40 740,40 880,250" fill="#2e4a3e" />
          <polygon points="700,40 740,40 752,70 728,62 716,78 690,60" fill="#f4f1ea" opacity="0.9" />
          {/* Volcán lejano */}
          <polygon points="300,250 410,110 440,130 470,100 600,250" fill="#2e4a3e" opacity="0.45" />
          {/* Línea de lago */}
          <rect x="0" y="236" width="1032" height="4" fill="#3c5a69" />
          <rect x="180" y="248" width="672" height="2" fill="#3c5a69" opacity="0.5" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "#2e4a3e", letterSpacing: -1.5, lineHeight: 1.05 }}>
            Valle Volcanes Propiedades
          </div>
          <div style={{ marginTop: 20, fontSize: 34, color: "#3c5a69" }}>Puerto Varas · Lagos y volcanes</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
