import { NextResponse } from "next/server";
import { publicStatsService } from "@/services/public-stats.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/public/stats
 *
 * Public endpoint (no auth required) that returns aggregate statistics:
 * - Total donated across all users
 * - Total active users
 * - Top companies being offset
 * - Top causes being funded
 *
 * Results are cached for 5 minutes.
 */
export async function GET() {
  try {
    const stats = await publicStatsService.getStats();

    return NextResponse.json(stats, {
      headers: {
        // Allow CORS for embedding
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        // Cache for 5 minutes
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    logger.error("Error fetching public stats", undefined, error);
    return NextResponse.json(
      { error: "Failed to fetch public stats" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
