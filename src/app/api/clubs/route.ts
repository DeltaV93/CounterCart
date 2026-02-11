import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clubService } from "@/services/club.service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const joinSchema = z.object({
  clubId: z.string(),
  inviteCode: z.string().optional(),
});

/**
 * GET /api/clubs
 * List all clubs, optionally filtered by cause
 */
export async function GET(request: NextRequest) {
  try {
    const causeId = request.nextUrl.searchParams.get("causeId") || undefined;
    const clubs = await clubService.getClubs(causeId);

    return NextResponse.json({
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        slug: club.slug,
        description: club.description,
        memberCount: club.memberCount,
        totalDonated: Number(club.totalDonated),
        rank: club.rank,
        cause: club.cause,
      })),
    });
  } catch (error) {
    logger.error("Error listing clubs", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clubs
 * Join a club
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { clubId, inviteCode } = joinSchema.parse(body);

    // If invite code provided, find the inviter's membership ID
    let invitedById: string | undefined;
    if (inviteCode) {
      const inviter = await clubService.findMemberByInviteCode(inviteCode);
      if (inviter && inviter.clubId === clubId) {
        invitedById = inviter.id;
      }
    }

    const result = await clubService.joinClub(user.id, clubId, invitedById);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      membership: result.membership,
    });
  } catch (error) {
    logger.error("Error joining club", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
