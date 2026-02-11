import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "edge";

/**
 * GET /api/share/receipt/[code]
 * Generate dynamic OG image for social sharing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Find user by referral code
    const user = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true },
    });

    if (!user) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#18181b",
              color: "#fafafa",
              fontSize: 32,
            }}
          >
            Invalid referral code
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    // Get user's recent donation stats
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [donations, totalStats] = await Promise.all([
      prisma.donation.findMany({
        where: {
          userId: user.id,
          status: "COMPLETED",
          completedAt: { gte: oneWeekAgo },
        },
        include: {
          transaction: {
            include: { matchedMapping: true },
          },
        },
        take: 5,
      }),
      prisma.donation.aggregate({
        where: {
          userId: user.id,
          status: "COMPLETED",
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Aggregate business spending
    const businessMap = new Map<string, number>();
    donations.forEach((d) => {
      if (d.transaction?.matchedMapping) {
        const name = d.transaction.matchedMapping.merchantName;
        const amount = Number(d.transaction.amount);
        businessMap.set(name, (businessMap.get(name) || 0) + amount);
      }
    });

    const topBusinesses = Array.from(businessMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const totalSpent = topBusinesses.reduce((sum, [, amt]) => sum + amt, 0);
    const totalDonated = donations.reduce(
      (sum, d) => sum + Number(d.amount),
      0
    );

    // Get unique charities
    const charities = [...new Set(donations.map((d) => d.charityName))].slice(
      0,
      3
    );

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#18181b",
            color: "#fafafa",
            padding: 60,
            fontFamily: "system-ui",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              CounterCart
            </div>
            <div
              style={{
                fontSize: 24,
                color: "#a1a1aa",
              }}
            >
              Offset Receipt
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", gap: 60, flex: 1 }}>
            {/* Left column - Spent at */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  color: "#facc15",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                This week I spent
              </div>
              {topBusinesses.map(([name, amount], i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 28,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ maxWidth: 300 }}>{name}</span>
                  <span style={{ color: "#a1a1aa" }}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  borderTop: "2px dashed #3f3f46",
                  paddingTop: 16,
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 32,
                  fontWeight: "bold",
                }}
              >
                <span>Total</span>
                <span style={{ color: "#facc15" }}>${totalSpent.toFixed(2)}</span>
              </div>
            </div>

            {/* Right column - Offset to */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  color: "#22c55e",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                But offset with
              </div>
              {charities.map((name, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 28,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: "#22c55e", marginRight: 12 }}>+</span>
                  <span>{name}</span>
                </div>
              ))}
              <div
                style={{
                  borderTop: "2px dashed #3f3f46",
                  paddingTop: 16,
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 32,
                  fontWeight: "bold",
                }}
              >
                <span>Donated</span>
                <span style={{ color: "#22c55e" }}>
                  ${totalDonated.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "2px solid #3f3f46",
              paddingTop: 30,
              marginTop: 30,
            }}
          >
            <div style={{ fontSize: 24, color: "#a1a1aa" }}>
              Join me at countercart.app/r/{code}
            </div>
            <div style={{ fontSize: 20, color: "#facc15" }}>
              Total offset: ${Number(totalStats._sum.amount || 0).toFixed(2)}
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
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#18181b",
            color: "#fafafa",
            fontSize: 48,
            fontWeight: "bold",
          }}
        >
          CounterCart - Offset Your Impact
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
