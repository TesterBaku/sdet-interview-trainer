import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
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
              fontSize: 90,
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
              width: 58,
              height: 11,
              background: "#d84f2a",
              borderRadius: 99,
              marginTop: 7,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
