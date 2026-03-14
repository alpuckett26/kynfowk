import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 512,
  height: 512
};

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
          background:
            "radial-gradient(circle at top left, rgba(255, 221, 196, 0.92), transparent 38%), linear-gradient(180deg, #fffaf5 0%, #fcf7f1 55%, #f6eee5 100%)",
          color: "#8d4428",
          fontSize: 176,
          fontWeight: 700
        }}
      >
        <div
          style={{
            width: 368,
            height: 368,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 120,
            background: "linear-gradient(135deg, #c7663f 0%, #8d4428 100%)",
            boxShadow: "0 20px 48px rgba(141, 68, 40, 0.22)",
            color: "#fff9f5",
            letterSpacing: "-0.08em"
          }}
        >
          K
        </div>
      </div>
    ),
    size
  );
}
