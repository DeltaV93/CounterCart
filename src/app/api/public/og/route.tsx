import { ImageResponse } from "next/og";
import { publicStatsService } from "@/services/public-stats.service";

export const runtime = "edge";

/**
 * GET /api/public/og
 *
 * Dynamic OG image generation with live stats
 * Used for social sharing of the leaderboards page
 */
export async function GET() {
  try {
    const stats = await publicStatsService.getStats();

    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(stats.totalDonated);

    const topCompany = stats.topCompaniesOffset[0]?.merchantName || "N/A";
    const topCause = stats.topCauses[0]?.causeName || "N/A";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#F0EBE0",
            padding: "60px",
            fontFamily: "system-ui",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "#E2C230",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0A0A0A",
                fontSize: "24px",
                marginRight: "16px",
              }}
            >
              {"↻"}
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#0A0A0A",
                letterSpacing: "0.1em",
              }}
            >
              COUNTERCART
            </span>
          </div>

          {/* Main stat */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                color: "#5A5A52",
                marginBottom: "16px",
                letterSpacing: "0.2em",
              }}
            >
              COMMUNITY IMPACT
            </div>
            <div
              style={{
                fontSize: "96px",
                fontWeight: "bold",
                color: "#0A0A0A",
                lineHeight: 1,
                marginBottom: "24px",
              }}
            >
              {formattedTotal}
            </div>
            <div
              style={{
                fontSize: "28px",
                color: "#0A0A0A",
              }}
            >
              DONATED TO CAUSES THAT MATTER
            </div>
          </div>

          {/* Bottom stats */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              borderTop: "2px solid #0A0A0A",
              paddingTop: "32px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontSize: "14px", color: "#5A5A52", marginBottom: "4px" }}
              >
                USERS
              </span>
              <span style={{ fontSize: "32px", fontWeight: "bold", color: "#0A0A0A" }}>
                {stats.totalUsers.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontSize: "14px", color: "#5A5A52", marginBottom: "4px" }}
              >
                TOP COMPANY OFFSET
              </span>
              <span style={{ fontSize: "32px", fontWeight: "bold", color: "#0A0A0A" }}>
                {topCompany}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontSize: "14px", color: "#5A5A52", marginBottom: "4px" }}
              >
                TOP CAUSE
              </span>
              <span style={{ fontSize: "32px", fontWeight: "bold", color: "#0A0A0A" }}>
                {topCause}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    // Fallback static image on error
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
            backgroundColor: "#F0EBE0",
            fontFamily: "system-ui",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                backgroundColor: "#E2C230",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0A0A0A",
                fontSize: "32px",
                marginRight: "24px",
              }}
            >
              {"↻"}
            </div>
            <span
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#0A0A0A",
                letterSpacing: "0.1em",
              }}
            >
              COUNTERCART
            </span>
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "#0A0A0A",
            }}
          >
            COMMUNITY LEADERBOARDS
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
