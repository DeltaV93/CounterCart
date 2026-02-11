import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { BadgeConfig, getBadgeById, getMilestoneBadges } from "@/config/badges";

/**
 * Badge awarding logic
 *
 * This module handles checking eligibility and awarding badges to users
 * based on their activity, milestones, and challenge participation.
 */

interface AwardResult {
  success: boolean;
  badgeId?: string;
  alreadyHad?: boolean;
  error?: string;
}

/**
 * Award a specific badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeId: string
): Promise<AwardResult> {
  const badge = getBadgeById(badgeId);
  if (!badge) {
    return { success: false, error: "Badge not found" };
  }

  if (!badge.isActive) {
    return { success: false, error: "Badge is no longer earnable" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if user already has this badge
    if (user.badges.includes(badgeId)) {
      return { success: true, badgeId, alreadyHad: true };
    }

    // Award the badge
    await prisma.user.update({
      where: { id: userId },
      data: {
        badges: {
          push: badgeId,
        },
      },
    });

    logger.info("Badge awarded to user", { userId, badgeId });
    return { success: true, badgeId };
  } catch (error) {
    logger.error("Error awarding badge", { userId, badgeId }, error);
    return { success: false, error: "Failed to award badge" };
  }
}

/**
 * Remove a badge from a user (admin function)
 */
export async function revokeBadge(
  userId: string,
  badgeId: string
): Promise<AwardResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (!user.badges.includes(badgeId)) {
      return { success: false, error: "User does not have this badge" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        badges: user.badges.filter((id) => id !== badgeId),
      },
    });

    logger.info("Badge revoked from user", { userId, badgeId });
    return { success: true, badgeId };
  } catch (error) {
    logger.error("Error revoking badge", { userId, badgeId }, error);
    return { success: false, error: "Failed to revoke badge" };
  }
}

/**
 * Check and award milestone badges based on user's total donations
 */
export async function checkMilestoneBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = [];

  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        badges: true,
        _count: {
          select: {
            donations: {
              where: { status: "COMPLETED" },
            },
            userCauses: true,
          },
        },
      },
    });

    if (!user) {
      return awardedBadges;
    }

    // Get total donated amount
    const totalDonated = await prisma.donation.aggregate({
      where: {
        userId,
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const totalAmount = totalDonated._sum.amount?.toNumber() || 0;
    const donationCount = user._count.donations;
    const causeCount = user._count.userCauses;

    const milestoneBadges = getMilestoneBadges();

    for (const badge of milestoneBadges) {
      // Skip if user already has this badge
      if (user.badges.includes(badge.id)) {
        continue;
      }

      let eligible = false;

      switch (badge.id) {
        case "FIRST_OFFSET":
          eligible = donationCount >= 1;
          break;
        case "CENTURY_CLUB":
          eligible = totalAmount >= 100;
          break;
        case "FIVE_HUNDRED_CLUB":
          eligible = totalAmount >= 500;
          break;
        case "THOUSAND_CLUB":
          eligible = totalAmount >= 1000;
          break;
        case "MULTI_CAUSE_HERO":
          eligible = causeCount >= 3;
          break;
        case "CONSISTENT_GIVER":
          // Check for 3 consecutive months of donations
          eligible = await checkConsecutiveMonths(userId, 3);
          break;
        default:
          // For other milestone badges, check threshold
          if (badge.threshold && badge.category === "milestone") {
            eligible = totalAmount >= badge.threshold;
          }
      }

      if (eligible) {
        const result = await awardBadge(userId, badge.id);
        if (result.success && !result.alreadyHad) {
          awardedBadges.push(badge.id);
        }
      }
    }

    return awardedBadges;
  } catch (error) {
    logger.error("Error checking milestone badges", { userId }, error);
    return awardedBadges;
  }
}

/**
 * Check if user has made donations in consecutive months
 */
async function checkConsecutiveMonths(
  userId: string,
  monthsRequired: number
): Promise<boolean> {
  try {
    // Get distinct months where user made completed donations
    const donations = await prisma.donation.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
      select: {
        completedAt: true,
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    if (donations.length === 0) {
      return false;
    }

    // Extract unique year-month combinations
    const months = new Set<string>();
    for (const donation of donations) {
      if (donation.completedAt) {
        const yearMonth = `${donation.completedAt.getFullYear()}-${String(
          donation.completedAt.getMonth() + 1
        ).padStart(2, "0")}`;
        months.add(yearMonth);
      }
    }

    const sortedMonths = Array.from(months).sort().reverse();

    if (sortedMonths.length < monthsRequired) {
      return false;
    }

    // Check for consecutive months starting from most recent
    let consecutiveCount = 1;
    for (
      let i = 1;
      i < sortedMonths.length && consecutiveCount < monthsRequired;
      i++
    ) {
      const [year1, month1] = sortedMonths[i - 1].split("-").map(Number);
      const [year2, month2] = sortedMonths[i].split("-").map(Number);

      // Check if consecutive
      const date1 = new Date(year1, month1 - 1);
      const date2 = new Date(year2, month2 - 1);
      const diffMonths =
        (date1.getFullYear() - date2.getFullYear()) * 12 +
        (date1.getMonth() - date2.getMonth());

      if (diffMonths === 1) {
        consecutiveCount++;
      } else {
        // Reset if gap found
        consecutiveCount = 1;
      }
    }

    return consecutiveCount >= monthsRequired;
  } catch (error) {
    logger.error("Error checking consecutive months", { userId }, error);
    return false;
  }
}

/**
 * Check and award referral badges
 */
export async function checkReferralBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = [];

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCount: true, badges: true },
    });

    if (!user) {
      return awardedBadges;
    }

    // Check for REFERRAL_CHAMPION badge
    if (user.referralCount >= 5 && !user.badges.includes("REFERRAL_CHAMPION")) {
      const result = await awardBadge(userId, "REFERRAL_CHAMPION");
      if (result.success && !result.alreadyHad) {
        awardedBadges.push("REFERRAL_CHAMPION");
      }
    }

    return awardedBadges;
  } catch (error) {
    logger.error("Error checking referral badges", { userId }, error);
    return awardedBadges;
  }
}

/**
 * Get all badges a user has earned
 */
export async function getUserBadges(userId: string): Promise<BadgeConfig[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    if (!user) {
      return [];
    }

    return user.badges
      .map((badgeId) => getBadgeById(badgeId))
      .filter((badge): badge is BadgeConfig => badge !== undefined);
  } catch (error) {
    logger.error("Error getting user badges", { userId }, error);
    return [];
  }
}

/**
 * Check if a user has a specific badge
 */
export async function userHasBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    return user?.badges.includes(badgeId) ?? false;
  } catch (error) {
    logger.error("Error checking user badge", { userId, badgeId }, error);
    return false;
  }
}
