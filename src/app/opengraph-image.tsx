import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "CounterCart - Turn purchases into donations";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#18181b",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #27272a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #27272a 2%, transparent 0%)",
          backgroundSize: "100px 100px",
        }}
      >
        {/* Logo and brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              backgroundColor: "#facc15",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              marginRight: 20,
            }}
          >
            ↺
          </div>
          <span
            style={{
              fontSize: 64,
              fontWeight: "bold",
              color: "#ffffff",
              letterSpacing: "0.1em",
            }}
          >
            COUNTERCART
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: "#a1a1aa",
            marginBottom: 40,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Offset Your Purchases with Purpose
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#27272a",
              padding: "16px 24px",
              borderRadius: 8,
              color: "#facc15",
              fontSize: 20,
            }}
          >
            💳 Track Purchases
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#27272a",
              padding: "16px 24px",
              borderRadius: 8,
              color: "#facc15",
              fontSize: 20,
            }}
          >
            🎯 Match Causes
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#27272a",
              padding: "16px 24px",
              borderRadius: 8,
              color: "#facc15",
              fontSize: 20,
            }}
          >
            💝 Auto-Donate
          </div>
        </div>

        {/* Bottom text */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#71717a",
          }}
        >
          Turn every purchase into a force for good
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
