import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { organizationService } from "@/services/organization.service";
import { logger } from "@/lib/logger";

/**
 * POST /api/organizations/leave
 * Leave current organization
 */
export async function POST() {
  try {
    const user = await requireUser();

    // Get user's organization
    const membership = await organizationService.getUserOrganization(user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of any organization" },
        { status: 400 }
      );
    }

    const result = await organizationService.leaveOrganization(
      user.id,
      membership.org.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error leaving organization", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
