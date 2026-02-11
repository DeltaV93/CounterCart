import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { challengeService } from "@/services/challenge.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/challenges
 * List challenges with optional filters
 *
 * Query params:
 * - featured: "true" to get only featured challenge
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";

    // If requesting featured challenge specifically
    if (featured) {
      const challenge = await challengeService.getFeaturedChallenge();
      if (!challenge) {
        return NextResponse.json({ challenge: null });
      }

      return NextResponse.json({
        challenge: {
          id: challenge.id,
          slug: challenge.slug,
          title: challenge.title,
          description: challenge.description,
          shortDesc: challenge.shortDesc,
          goalAmount: Number(challenge.goalAmount),
          currentAmount: Number(challenge.currentAmount),
          participantCount: challenge.participantCount,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          status: challenge.status,
          imageUrl: challenge.imageUrl,
          badgeId: challenge.badgeId,
          featured: challenge.featured,
          cause: challenge.cause,
        },
      });
    }

    // Get all active challenges
    const challenges = await challengeService.getActiveChallenges();

    // Get user's participations if logged in
    const user = await getCurrentUser();
    let userParticipations: Set<string> = new Set();

    if (user) {
      const userChallenges = await challengeService.getUserChallenges(user.id);
      userParticipations = new Set(userChallenges.map((c) => c.challengeId));
    }

    return NextResponse.json({
      challenges: challenges.map((challenge) => {
        const goalAmount = Number(challenge.goalAmount);
        const currentAmount = Number(challenge.currentAmount);
        const progress =
          goalAmount > 0 ? Math.min(100, (currentAmount / goalAmount) * 100) : 0;
        const daysRemaining = Math.max(
          0,
          Math.ceil(
            (new Date(challenge.endDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        );

        return {
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
          isParticipating: userParticipations.has(challenge.id),
          progress,
          daysRemaining,
        };
      }),
    });
  } catch (error) {
    logger.error("Error listing challenges", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
