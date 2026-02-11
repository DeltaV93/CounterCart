import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clubService } from "@/services/club.service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/clubs/[slug]
 * Get club details by slug
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();

    const club = await clubService.getClubBySlug(slug);

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get user's membership if logged in
    let userMembership = null;
    if (user) {
      userMembership = await clubService.getUserMembership(user.id, club.id);
    }

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
        description: club.description,
        memberCount: club.memberCount,
        totalDonated: Number(club.totalDonated),
        rank: club.rank,
        cause: club.cause,
      },
      members: club.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        contributed: Number(m.contributed),
        role: m.role,
        inviteCount: m.inviteCount,
        joinedAt: m.joinedAt,
      })),
      userMembership: userMembership
        ? {
            id: userMembership.id,
            inviteCode: userMembership.inviteCode,
            contributed: Number(userMembership.contributed),
            inviteCount: userMembership.inviteCount,
            role: userMembership.role,
          }
        : null,
    });
  } catch (error) {
    logger.error("Error fetching club", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clubs/[slug]
 * Leave a club
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const club = await clubService.getClubBySlug(slug);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const result = await clubService.leaveClub(user.id, club.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error leaving club", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
