import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

/**
 * Generate a unique 8-character alphanumeric invite code
 */
function generateInviteCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate slug from name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class ClubService {
  /**
   * Get or create a default club for a cause
   */
  async getOrCreateDefaultClub(causeId: string, causeName: string) {
    let club = await prisma.club.findFirst({
      where: { causeId },
    });

    if (!club) {
      const slug = slugify(`${causeName}-club`);
      club = await prisma.club.create({
        data: {
          causeId,
          name: `${causeName} Club`,
          slug,
          description: `Join fellow supporters fighting for ${causeName}. Together, we make a bigger impact.`,
        },
      });
      logger.info("Created default club", { clubId: club.id, causeId });
    }

    return club;
  }

  /**
   * Get all clubs, optionally filtered by cause
   */
  async getClubs(causeId?: string) {
    return prisma.club.findMany({
      where: causeId ? { causeId } : undefined,
      include: {
        cause: {
          select: {
            id: true,
            name: true,
            slug: true,
            iconName: true,
            color: true,
          },
        },
      },
      orderBy: [{ memberCount: "desc" }, { totalDonated: "desc" }],
    });
  }

  /**
   * Get club by slug
   */
  async getClubBySlug(slug: string) {
    return prisma.club.findUnique({
      where: { slug },
      include: {
        cause: {
          select: {
            id: true,
            name: true,
            slug: true,
            iconName: true,
            color: true,
          },
        },
        members: {
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
   * Get user's club membership
   */
  async getUserMembership(userId: string, clubId: string) {
    return prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });
  }

  /**
   * Get all clubs a user is a member of
   */
  async getUserClubs(userId: string) {
    return prisma.clubMember.findMany({
      where: { userId },
      include: {
        club: {
          include: {
            cause: {
              select: {
                id: true,
                name: true,
                slug: true,
                iconName: true,
                color: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Join a club
   */
  async joinClub(
    userId: string,
    clubId: string,
    invitedById?: string
  ): Promise<{ success: boolean; membership?: unknown; error?: string }> {
    // Check if already a member
    const existing = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Already a member of this club" };
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existingCode = await prisma.clubMember.findUnique({
        where: { inviteCode },
      });
      if (!existingCode) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Create membership and update club stats
    const [membership] = await prisma.$transaction([
      prisma.clubMember.create({
        data: {
          clubId,
          userId,
          inviteCode,
          invitedById,
        },
      }),
      prisma.club.update({
        where: { id: clubId },
        data: {
          memberCount: { increment: 1 },
        },
      }),
    ]);

    // If invited by someone, update their invite count
    if (invitedById) {
      await prisma.clubMember.update({
        where: { id: invitedById },
        data: { inviteCount: { increment: 1 } },
      });
    }

    logger.info("User joined club", { userId, clubId });

    return { success: true, membership };
  }

  /**
   * Leave a club
   */
  async leaveClub(userId: string, clubId: string) {
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });

    if (!membership) {
      return { success: false, error: "Not a member of this club" };
    }

    await prisma.$transaction([
      prisma.clubMember.delete({
        where: { id: membership.id },
      }),
      prisma.club.update({
        where: { id: clubId },
        data: {
          memberCount: { decrement: 1 },
        },
      }),
    ]);

    logger.info("User left club", { userId, clubId });

    return { success: true };
  }

  /**
   * Find club member by invite code
   */
  async findMemberByInviteCode(inviteCode: string) {
    return prisma.clubMember.findUnique({
      where: { inviteCode },
      include: {
        club: {
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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update member's contribution amount after a donation
   */
  async recordContribution(userId: string, causeId: string, amount: number) {
    // Find the user's membership in a club for this cause
    const membership = await prisma.clubMember.findFirst({
      where: {
        userId,
        club: { causeId },
      },
    });

    if (!membership) {
      return;
    }

    await prisma.$transaction([
      prisma.clubMember.update({
        where: { id: membership.id },
        data: {
          contributed: { increment: amount },
        },
      }),
      prisma.club.update({
        where: { id: membership.clubId },
        data: {
          totalDonated: { increment: amount },
        },
      }),
    ]);

    logger.info("Recorded club contribution", {
      userId,
      clubId: membership.clubId,
      amount,
    });
  }
}

export const clubService = new ClubService();
