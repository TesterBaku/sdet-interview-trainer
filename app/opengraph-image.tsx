import { ImageResponse } from "next/og";

export const alt = "SDET Interview Trainer — QA Automation and SDET interview practice";
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
          background: "#17324d",
          padding: 80,
        }}
      >
        {/* Brand mark: Georgia "S" with orange underbar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span
            style={{
              fontSize: 140,
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
              width: 96,
              height: 18,
              background: "#d84f2a",
              borderRadius: 99,
              marginTop: 16,
            }}
          />
        </div>

        {/* Title + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 76,
              fontWeight: 900,
              color: "white",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            SDET Interview Trainer
          </span>
          <span
            style={{
              fontSize: 36,
              color: "#f6efe3",
              marginTop: 24,
              lineHeight: 1.3,
            }}
          >
            Flashcards, quizzes, mock interviews, and coding tasks for QA Automation prep.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
