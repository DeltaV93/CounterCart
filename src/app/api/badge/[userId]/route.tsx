import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "edge";

// Cache badge for 1 hour
export const revalidate = 3600;

interface BadgeParams {
  params: Promise<{ userId: string }>;
}

type BadgeStyle = "minimal" | "detailed" | "compact";

interface BadgeDimensions {
  width: number;
  height: number;
}

const BADGE_DIMENSIONS: Record<BadgeStyle, BadgeDimensions> = {
  minimal: { width: 120, height: 30 },
  detailed: { width: 300, height: 100 },
  compact: { width: 80, height: 20 },
};

// Editorial design colors
const COLORS = {
  darkBg: "#18181b",
  yellow: "#facc15",
  green: "#22c55e",
  white: "#fafafa",
  gray: "#a1a1aa",
};

export async function GET(request: NextRequest, { params }: BadgeParams) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const style = (searchParams.get("style") as BadgeStyle) || "minimal";

    // Validate style
    if (!BADGE_DIMENSIONS[style]) {
      return new Response("Invalid badge style", { status: 400 });
    }

    // Fetch user with their donation stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        badgeEnabled: true,
        badgeStyle: true,
      },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (!user.badgeEnabled) {
      return new Response("Badge not enabled for this user", { status: 403 });
    }

    // Get total donations (aggregate only - no transaction details)
    const donationStats = await prisma.donation.aggregate({
      where: {
        userId: userId,
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const totalDonated = donationStats._sum.amount?.toNumber() || 0;
    const formattedAmount = formatDonationAmount(totalDonated);

    const { width, height } = BADGE_DIMENSIONS[style];

    // Generate badge based on style
    const badgeContent = generateBadgeContent(style, formattedAmount, user.name);

    return new ImageResponse(badgeContent, {
      width,
      height,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    logger.error("Error generating badge", {}, error);
    return new Response("Error generating badge", { status: 500 });
  }
}

function formatDonationAmount(amount: number): string {
  if (amount >= 10000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return `$${Math.round(amount)}`;
  }
}

function generateBadgeContent(
  style: BadgeStyle,
  amount: string,
  name: string | null
) {
  switch (style) {
    case "compact":
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.darkBg,
            padding: "4px 8px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                color: COLORS.green,
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              {amount}
            </span>
            <span
              style={{
                color: COLORS.gray,
                fontSize: "8px",
              }}
            >
              donated
            </span>
          </div>
        </div>
      );

    case "minimal":
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.darkBg,
            padding: "6px 12px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={COLORS.yellow}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span
              style={{
                color: COLORS.green,
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {amount}
            </span>
          </div>
          <span
            style={{
              color: COLORS.gray,
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            CounterCart
          </span>
        </div>
      );

    case "detailed":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.darkBg,
            padding: "16px 20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={COLORS.yellow}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span
              style={{
                color: COLORS.white,
                fontSize: "14px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              CounterCart
            </span>
          </div>

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                color: COLORS.gray,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {name ? `${name.split(" ")[0]} has donated` : "Total donated"}
            </span>
            <span
              style={{
                color: COLORS.green,
                fontSize: "32px",
                fontWeight: "bold",
                lineHeight: "1",
              }}
            >
              {amount}
            </span>
            <span
              style={{
                color: COLORS.gray,
                fontSize: "10px",
              }}
            >
              to counter harmful business practices
            </span>
          </div>
        </div>
      );
  }
}
