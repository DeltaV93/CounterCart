import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { organizationService } from "@/services/organization.service";
import { logger } from "@/lib/logger";

const joinOrgSchema = z.object({
  inviteCode: z.string().min(6).max(12),
});

/**
 * GET /api/organizations/join?code=XXXXXXXX
 * Get organization details by invite code (for preview)
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json(
        { error: "Invite code required" },
        { status: 400 }
      );
    }

    const organization = await organizationService.getOrganizationByInviteCode(code);

    if (!organization) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logoUrl,
        memberCount: organization._count.members,
        totalDonated: Number(organization.totalDonated),
      },
    });
  } catch (error) {
    logger.error("Error fetching organization by invite code", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/join
 * Join organization via invite code
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { inviteCode } = joinOrgSchema.parse(body);

    const result = await organizationService.joinOrganization(user.id, inviteCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: result.membership,
    });
  } catch (error) {
    logger.error("Error joining organization", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid invite code format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
