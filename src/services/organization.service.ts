import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

/**
 * Generate a unique 8-character alphanumeric invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate slug from organization name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface CreateOrganizationData {
  name: string;
  adminEmail: string;
  domain?: string;
  logoUrl?: string;
}

export interface OrganizationReport {
  organization: {
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    totalDonated: number;
  };
  period: {
    start: Date;
    end: Date;
  };
  stats: {
    totalDonations: number;
    donationCount: number;
    activeMembers: number;
    topCauses: Array<{ name: string; amount: number }>;
    monthlyBreakdown: Array<{ month: string; amount: number }>;
  };
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    donated: number;
    joinedAt: Date;
  }>;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  async createOrganization(
    data: CreateOrganizationData,
    userId: string
  ): Promise<{ success: boolean; organization?: unknown; error?: string }> {
    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.organization.findUnique({
        where: { inviteCode },
      });
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Generate unique slug
    let slug = slugify(data.name);
    let slugAttempts = 0;
    while (slugAttempts < 10) {
      const existingSlug = await prisma.organization.findUnique({
        where: { slug },
      });
      if (!existingSlug) break;
      slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`;
      slugAttempts++;
    }

    try {
      // Create organization and add creator as owner
      const [organization] = await prisma.$transaction([
        prisma.organization.create({
          data: {
            name: data.name,
            slug,
            inviteCode,
            adminEmail: data.adminEmail,
            domain: data.domain,
            logoUrl: data.logoUrl,
            seatCount: 1,
          },
        }),
        // Update user to premium
        prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: "premium" },
        }),
      ]);

      // Add creator as owner
      await prisma.orgMember.create({
        data: {
          orgId: organization.id,
          userId,
          role: "owner",
        },
      });

      logger.info("Organization created", {
        orgId: organization.id,
        userId,
        name: data.name,
      });

      return { success: true, organization };
    } catch (error) {
      logger.error("Error creating organization", { userId, name: data.name }, error);
      return { success: false, error: "Failed to create organization" };
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string) {
    return prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get organization by invite code
   */
  async getOrganizationByInviteCode(inviteCode: string) {
    return prisma.organization.findUnique({
      where: { inviteCode },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  /**
   * Get user's organization membership
   */
  async getUserOrganization(userId: string) {
    const membership = await prisma.orgMember.findFirst({
      where: { userId },
      include: {
        org: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return membership;
  }

  /**
   * Join organization via invite code
   */
  async joinOrganization(
    userId: string,
    inviteCode: string
  ): Promise<{ success: boolean; membership?: unknown; error?: string }> {
    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { inviteCode },
    });

    if (!organization) {
      return { success: false, error: "Invalid invite code" };
    }

    // Check seat limit
    if (organization.seatCount >= organization.maxSeats) {
      return { success: false, error: "Organization has reached its seat limit" };
    }

    // Check if already a member
    const existing = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId: organization.id,
          userId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Already a member of this organization" };
    }

    // Check if user is already in another organization
    const otherMembership = await prisma.orgMember.findFirst({
      where: { userId },
    });

    if (otherMembership) {
      return { success: false, error: "Already a member of another organization" };
    }

    try {
      // Create membership, update seat count, and upgrade user to premium
      const [membership] = await prisma.$transaction([
        prisma.orgMember.create({
          data: {
            orgId: organization.id,
            userId,
            role: "member",
          },
        }),
        prisma.organization.update({
          where: { id: organization.id },
          data: { seatCount: { increment: 1 } },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: "premium" },
        }),
      ]);

      logger.info("User joined organization", {
        userId,
        orgId: organization.id,
      });

      return { success: true, membership };
    } catch (error) {
      logger.error("Error joining organization", { userId, inviteCode }, error);
      return { success: false, error: "Failed to join organization" };
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    orgId: string,
    memberId: string,
    requesterId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Check requester has permission (admin or owner)
    const requesterMembership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: requesterId,
        },
      },
    });

    if (!requesterMembership || !["admin", "owner"].includes(requesterMembership.role)) {
      return { success: false, error: "Not authorized to remove members" };
    }

    // Find the member to remove
    const memberToRemove = await prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove || memberToRemove.orgId !== orgId) {
      return { success: false, error: "Member not found" };
    }

    // Can't remove the owner
    if (memberToRemove.role === "owner") {
      return { success: false, error: "Cannot remove the organization owner" };
    }

    // Admins can't remove other admins
    if (memberToRemove.role === "admin" && requesterMembership.role !== "owner") {
      return { success: false, error: "Only the owner can remove admins" };
    }

    try {
      await prisma.$transaction([
        prisma.orgMember.delete({
          where: { id: memberId },
        }),
        prisma.organization.update({
          where: { id: orgId },
          data: { seatCount: { decrement: 1 } },
        }),
        // Downgrade user to free tier
        prisma.user.update({
          where: { id: memberToRemove.userId },
          data: { subscriptionTier: "free" },
        }),
      ]);

      logger.info("Member removed from organization", {
        orgId,
        memberId,
        removedBy: requesterId,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error removing member", { orgId, memberId }, error);
      return { success: false, error: "Failed to remove member" };
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    newRole: "member" | "admin",
    requesterId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Check requester is owner
    const requesterMembership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: requesterId,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== "owner") {
      return { success: false, error: "Only the owner can change member roles" };
    }

    // Find the member
    const member = await prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.orgId !== orgId) {
      return { success: false, error: "Member not found" };
    }

    if (member.role === "owner") {
      return { success: false, error: "Cannot change the owner's role" };
    }

    try {
      await prisma.orgMember.update({
        where: { id: memberId },
        data: { role: newRole },
      });

      logger.info("Member role updated", { orgId, memberId, newRole });

      return { success: true };
    } catch (error) {
      logger.error("Error updating member role", { orgId, memberId }, error);
      return { success: false, error: "Failed to update role" };
    }
  }

  /**
   * Leave organization
   */
  async leaveOrganization(
    userId: string,
    orgId: string
  ): Promise<{ success: boolean; error?: string }> {
    const membership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!membership) {
      return { success: false, error: "Not a member of this organization" };
    }

    if (membership.role === "owner") {
      return { success: false, error: "Owner cannot leave. Transfer ownership first." };
    }

    try {
      await prisma.$transaction([
        prisma.orgMember.delete({
          where: { id: membership.id },
        }),
        prisma.organization.update({
          where: { id: orgId },
          data: { seatCount: { decrement: 1 } },
        }),
        // Downgrade user to free tier
        prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: "free" },
        }),
      ]);

      logger.info("User left organization", { userId, orgId });

      return { success: true };
    } catch (error) {
      logger.error("Error leaving organization", { userId, orgId }, error);
      return { success: false, error: "Failed to leave organization" };
    }
  }

  /**
   * Regenerate invite code
   */
  async regenerateInviteCode(
    orgId: string,
    requesterId: string
  ): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
    // Check requester has permission
    const requesterMembership = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: requesterId,
        },
      },
    });

    if (!requesterMembership || !["admin", "owner"].includes(requesterMembership.role)) {
      return { success: false, error: "Not authorized" };
    }

    // Generate new code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.organization.findUnique({
        where: { inviteCode },
      });
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    try {
      await prisma.organization.update({
        where: { id: orgId },
        data: { inviteCode },
      });

      logger.info("Invite code regenerated", { orgId, requesterId });

      return { success: true, inviteCode };
    } catch (error) {
      logger.error("Error regenerating invite code", { orgId }, error);
      return { success: false, error: "Failed to regenerate invite code" };
    }
  }

  /**
   * Generate CSR report for organization
   */
  async generateReport(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OrganizationReport | null> {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return null;
    }

    const memberUserIds = organization.members.map((m) => m.userId);

    // Get donations for all members in the period
    // Include both charity (legacy) and designatedCause (fiscal sponsor model)
    const donations = await prisma.donation.findMany({
      where: {
        userId: { in: memberUserIds },
        status: "COMPLETED",
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        charity: {
          include: {
            cause: true,
          },
        },
        designatedCause: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate stats
    const totalDonations = donations.reduce(
      (sum, d) => sum + d.amount.toNumber(),
      0
    );

    // Group by cause
    // Support both legacy (charity.cause) and fiscal sponsor (designatedCause) models
    const causeAmounts = new Map<string, number>();
    for (const donation of donations) {
      // Prefer designatedCause (fiscal sponsor), fall back to charity.cause (legacy)
      const causeName = donation.designatedCause?.name || donation.charity?.cause?.name || "General";
      causeAmounts.set(
        causeName,
        (causeAmounts.get(causeName) || 0) + donation.amount.toNumber()
      );
    }
    const topCauses = Array.from(causeAmounts.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Group by month
    const monthlyAmounts = new Map<string, number>();
    for (const donation of donations) {
      if (donation.completedAt) {
        const monthKey = donation.completedAt.toISOString().slice(0, 7);
        monthlyAmounts.set(
          monthKey,
          (monthlyAmounts.get(monthKey) || 0) + donation.amount.toNumber()
        );
      }
    }
    const monthlyBreakdown = Array.from(monthlyAmounts.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get per-member donation totals
    const memberDonations = new Map<string, number>();
    for (const donation of donations) {
      memberDonations.set(
        donation.userId,
        (memberDonations.get(donation.userId) || 0) + donation.amount.toNumber()
      );
    }

    const activeMembers = new Set(donations.map((d) => d.userId)).size;

    const members = organization.members.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      donated: memberDonations.get(m.userId) || 0,
      joinedAt: m.joinedAt,
    }));

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        memberCount: organization.seatCount,
        totalDonated: Number(organization.totalDonated),
      },
      period: {
        start: startDate,
        end: endDate,
      },
      stats: {
        totalDonations,
        donationCount: donations.length,
        activeMembers,
        topCauses,
        monthlyBreakdown,
      },
      members,
    };
  }

  /**
   * Update organization total donated (called after donations are processed)
   */
  async recordDonation(userId: string, amount: number): Promise<void> {
    const membership = await prisma.orgMember.findFirst({
      where: { userId },
    });

    if (!membership) {
      return;
    }

    await prisma.organization.update({
      where: { id: membership.orgId },
      data: {
        totalDonated: { increment: amount },
      },
    });

    logger.info("Organization donation recorded", {
      orgId: membership.orgId,
      userId,
      amount,
    });
  }
}

export const organizationService = new OrganizationService();
