import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clubService } from "@/services/club.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/user/clubs
 * Get the current user's club memberships
 */
export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await clubService.getUserClubs(user.id);

    return NextResponse.json({
      memberships: memberships.map((m) => ({
        id: m.id,
        clubId: m.clubId,
        inviteCode: m.inviteCode,
        contributed: Number(m.contributed),
        inviteCount: m.inviteCount,
        role: m.role,
        joinedAt: m.joinedAt,
        club: {
          id: m.club.id,
          name: m.club.name,
          slug: m.club.slug,
          memberCount: m.club.memberCount,
          totalDonated: Number(m.club.totalDonated),
          cause: m.club.cause,
        },
      })),
    });
  } catch (error) {
    logger.error("Error fetching user clubs", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
