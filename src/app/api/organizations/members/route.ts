import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { organizationService } from "@/services/organization.service";
import { logger } from "@/lib/logger";

const removeMemberSchema = z.object({
  memberId: z.string(),
});

const updateRoleSchema = z.object({
  memberId: z.string(),
  role: z.enum(["member", "admin"]),
});

/**
 * DELETE /api/organizations/members
 * Remove a member from organization
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { memberId } = removeMemberSchema.parse(body);

    // Get user's organization
    const membership = await organizationService.getUserOrganization(user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of any organization" },
        { status: 400 }
      );
    }

    const result = await organizationService.removeMember(
      membership.org.id,
      memberId,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error removing member", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations/members
 * Update member role
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { memberId, role } = updateRoleSchema.parse(body);

    // Get user's organization
    const membership = await organizationService.getUserOrganization(user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of any organization" },
        { status: 400 }
      );
    }

    const result = await organizationService.updateMemberRole(
      membership.org.id,
      memberId,
      role,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error updating member role", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
