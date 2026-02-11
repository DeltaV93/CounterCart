import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { challengeService } from "@/services/challenge.service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/challenges/[slug]
 * Get challenge details by slug
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();

    const challenge = await challengeService.getChallengeBySlug(slug);

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Calculate progress and time remaining
    const goalAmount = Number(challenge.goalAmount);
    const currentAmount = Number(challenge.currentAmount);
    const progress =
      goalAmount > 0 ? Math.min(100, (currentAmount / goalAmount) * 100) : 0;

    const now = new Date();
    const endDate = new Date(challenge.endDate);
    const startDate = new Date(challenge.startDate);

    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const daysUntilStart =
      startDate > now
        ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // Get user's participation if logged in
    let userParticipation = null;
    if (user) {
      const participation = await challengeService.getUserParticipation(
        user.id,
        challenge.id
      );
      if (participation) {
        // Calculate rank
        const higherContributors = challenge.participants.filter(
          (p) => Number(p.contributed) > Number(participation.contributed)
        ).length;

        userParticipation = {
          isParticipant: true,
          contributed: Number(participation.contributed),
          rank: higherContributors + 1,
          earnedBadge: participation.earnedBadge,
        };
      }
    }

    // Map participants
    const participants = challenge.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      contributed: Number(p.contributed),
      joinedAt: p.joinedAt,
      earnedBadge: p.earnedBadge,
    }));

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        shortDesc: challenge.shortDesc,
        goalAmount,
        currentAmount,
        participantCount: challenge.participantCount,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        status: challenge.status,
        imageUrl: challenge.imageUrl,
        badgeId: challenge.badgeId,
        featured: challenge.featured,
        cause: challenge.cause,
        progress,
        daysRemaining,
        daysUntilStart,
        isActive: challenge.status === "active",
        isUpcoming: challenge.status === "upcoming",
        isCompleted: challenge.status === "completed",
      },
      participants,
      userParticipation,
    });
  } catch (error) {
    logger.error("Error fetching challenge", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
