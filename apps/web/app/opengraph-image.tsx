import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kynfowk — Keep Your Family Close";
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
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #faf5ff 0%, #ffffff 50%, #fef3c7 100%)",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 16 }}>💜</div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "-0.02em",
          }}
        >
          Kynfowk
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#7c3aed",
            marginTop: 12,
            fontWeight: 600,
          }}
        >
          Keep Your Family Close
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#6b7280",
            marginTop: 32,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Schedule family calls effortlessly, track connection milestones, and
          celebrate every moment together.
        </div>
      </div>
    ),
    { ...size }
  );
}
