import { ImageResponse } from "next/og";

/**
 * The card that renders when a kynfowk.com link is shared — iMessage, Slack,
 * WhatsApp, anywhere. Without it a shared link is a bare grey URL, which is the
 * worst possible first impression for an app whose whole pitch is warmth.
 *
 * Generated rather than a static PNG so it stays in step with the brand the same
 * way icon.tsx does: same palette, same gradient, no binary asset to re-export
 * when the colors move. 1200x630 is the size every platform crops from.
 */
export const runtime = "edge";
export const alt = "Kynfowk — family coordination for shared availability, calls, and Time Together";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630
};

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background:
            "radial-gradient(circle at top left, rgba(255, 221, 196, 0.92), transparent 45%), linear-gradient(180deg, #fffaf5 0%, #fcf7f1 55%, #f6eee5 100%)",
          color: "#8d4428",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 112,
              height: 112,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 36,
              background: "linear-gradient(135deg, #c7663f 0%, #8d4428 100%)",
              boxShadow: "0 20px 48px rgba(141, 68, 40, 0.22)",
              color: "#fff9f5",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.08em"
            }}
          >
            K
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.03em" }}>Kynfowk</div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 46,
            lineHeight: 1.25,
            fontWeight: 600,
            maxWidth: 900,
            color: "#5f2f1c"
          }}
        >
          Family coordination that actually fits a family.
        </div>

        <div style={{ marginTop: 24, fontSize: 30, color: "#a2664c", maxWidth: 860 }}>
          Shared availability · Call scheduling · Time Together
        </div>
      </div>
    ),
    size
  );
}
