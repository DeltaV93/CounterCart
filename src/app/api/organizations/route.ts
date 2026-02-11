import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { organizationService } from "@/services/organization.service";
import { logger } from "@/lib/logger";

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

/**
 * GET /api/organizations
 * Get user's organization
 */
export async function GET() {
  try {
    const user = await requireUser();
    const membership = await organizationService.getUserOrganization(user.id);

    if (!membership) {
      return NextResponse.json({ organization: null });
    }

    const org = membership.org;

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        inviteCode: org.inviteCode,
        plan: org.plan,
        seatCount: org.seatCount,
        maxSeats: org.maxSeats,
        totalDonated: Number(org.totalDonated),
        logoUrl: org.logoUrl,
        createdAt: org.createdAt,
      },
      membership: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.joinedAt,
      },
      members: org.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    logger.error("Error fetching organization", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const data = createOrgSchema.parse(body);

    // Check if user is already in an organization
    const existingMembership = await organizationService.getUserOrganization(user.id);
    if (existingMembership) {
      return NextResponse.json(
        { error: "Already a member of an organization" },
        { status: 400 }
      );
    }

    const result = await organizationService.createOrganization(
      {
        name: data.name,
        adminEmail: user.email,
        domain: data.domain,
        logoUrl: data.logoUrl,
      },
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      organization: result.organization,
    });
  } catch (error) {
    logger.error("Error creating organization", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
