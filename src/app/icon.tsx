import { ImageResponse } from "next/og";
import { Monogram } from "./_brand/monogram";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2e4a3e",
          borderRadius: 6,
        }}
      >
        <Monogram size={28} color="#f4f1ea" />
      </div>
    ),
    { ...size },
  );
}
