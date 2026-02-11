import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getBadgeById } from "@/config/badges";

export class ChallengeService {
  /**
   * Get all active challenges
   */
  async getActiveChallenges() {
    const now = new Date();
    return prisma.challenge.findMany({
      where: {
        status: "active",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        cause: {
          select: {
            id: true,
            name: true,
            slug: true,
            iconName: true,
          },
        },
      },
      orderBy: [{ featured: "desc" }, { endDate: "asc" }],
    });
  }

  /**
   * Get featured challenge (for banner)
   */
  async getFeaturedChallenge() {
    const now = new Date();
    return prisma.challenge.findFirst({
      where: {
        status: "active",
        featured: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        cause: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Get challenge by slug
   */
  async getChallengeBySlug(slug: string) {
    return prisma.challenge.findUnique({
      where: { slug },
      include: {
        cause: {
          select: {
            id: true,
            name: true,
            slug: true,
            iconName: true,
          },
        },
        participants: {
          orderBy: { contributed: "desc" },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get user's participation in a challenge
   */
  async getUserParticipation(userId: string, challengeId: string) {
    return prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    });
  }

  /**
   * Get all challenges a user is participating in
   */
  async getUserChallenges(userId: string) {
    return prisma.challengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: {
          include: {
            cause: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        challenge: { endDate: "asc" },
      },
    });
  }

  /**
   * Join a challenge
   */
  async joinChallenge(
    userId: string,
    challengeId: string
  ): Promise<{ success: boolean; participation?: unknown; error?: string }> {
    // Check if challenge exists and is active
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return { success: false, error: "Challenge not found" };
    }

    const now = new Date();
    if (challenge.startDate > now || challenge.endDate < now) {
      return { success: false, error: "Challenge is not active" };
    }

    // Check if already participating
    const existing = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Already participating in this challenge" };
    }

    // Create participation and update challenge stats
    const [participation] = await prisma.$transaction([
      prisma.challengeParticipant.create({
        data: {
          challengeId,
          userId,
        },
      }),
      prisma.challenge.update({
        where: { id: challengeId },
        data: {
          participantCount: { increment: 1 },
        },
      }),
    ]);

    logger.info("User joined challenge", { userId, challengeId });

    return { success: true, participation };
  }

  /**
   * Record a contribution to a challenge
   */
  async recordContribution(
    userId: string,
    causeId: string | null,
    amount: number
  ) {
    // Find active challenges the user is participating in
    const now = new Date();
    const participations = await prisma.challengeParticipant.findMany({
      where: {
        userId,
        challenge: {
          status: "active",
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            { causeId: causeId },
            { causeId: null }, // Cross-cause challenges
          ],
        },
      },
      include: {
        challenge: true,
      },
    });

    if (participations.length === 0) {
      return;
    }

    // Update each participation
    for (const participation of participations) {
      await prisma.$transaction([
        prisma.challengeParticipant.update({
          where: { id: participation.id },
          data: {
            contributed: { increment: amount },
          },
        }),
        prisma.challenge.update({
          where: { id: participation.challengeId },
          data: {
            currentAmount: { increment: amount },
          },
        }),
      ]);

      logger.info("Recorded challenge contribution", {
        userId,
        challengeId: participation.challengeId,
        amount,
      });
    }
  }

  /**
   * Award badge to user if they participated in a challenge
   */
  async awardChallengeBadge(userId: string, challengeId: string) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge?.badgeId) {
      return;
    }

    const badge = getBadgeById(challenge.badgeId);
    if (!badge) {
      return;
    }

    // Check if user already has badge
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    if (user?.badges.includes(challenge.badgeId)) {
      return;
    }

    // Award badge
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          badges: { push: challenge.badgeId },
        },
      }),
      prisma.challengeParticipant.update({
        where: {
          challengeId_userId: {
            challengeId,
            userId,
          },
        },
        data: { earnedBadge: true },
      }),
    ]);

    logger.info("Awarded challenge badge", {
      userId,
      challengeId,
      badgeId: challenge.badgeId,
    });
  }

  /**
   * Update challenge statuses (run periodically)
   */
  async updateChallengeStatuses() {
    const now = new Date();

    // Activate upcoming challenges that have started
    await prisma.challenge.updateMany({
      where: {
        status: "upcoming",
        startDate: { lte: now },
      },
      data: { status: "active" },
    });

    // Complete active challenges that have ended
    const endedChallenges = await prisma.challenge.findMany({
      where: {
        status: "active",
        endDate: { lt: now },
      },
    });

    for (const challenge of endedChallenges) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { status: "completed" },
      });

      // Award badges to all participants
      if (challenge.badgeId) {
        const participants = await prisma.challengeParticipant.findMany({
          where: { challengeId: challenge.id },
        });

        for (const participant of participants) {
          await this.awardChallengeBadge(participant.userId, challenge.id);
        }
      }

      logger.info("Challenge completed", { challengeId: challenge.id });
    }
  }
}

export const challengeService = new ChallengeService();
