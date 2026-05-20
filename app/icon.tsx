import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "#17324d",
          borderRadius: 113,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 256,
              fontWeight: 900,
              color: "white",
              lineHeight: 1,
              fontFamily: "Georgia, serif",
            }}
          >
            S
          </span>
          <div
            style={{
              width: 164,
              height: 30,
              background: "#d84f2a",
              borderRadius: 99,
              marginTop: 20,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
