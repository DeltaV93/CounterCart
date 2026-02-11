import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { organizationService } from "@/services/organization.service";
import { logger } from "@/lib/logger";

const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/organizations/report
 * Generate CSR report for organization
 */
export async function GET(request: NextRequest) {
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

    // Only admins and owners can generate reports
    if (!["admin", "owner"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Not authorized to generate reports" },
        { status: 403 }
      );
    }

    // Parse date range
    const searchParams = request.nextUrl.searchParams;
    const { startDate: startStr, endDate: endStr } = reportQuerySchema.parse({
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    // Default to current year if not specified
    const now = new Date();
    const startDate = startStr
      ? new Date(startStr)
      : new Date(now.getFullYear(), 0, 1);
    const endDate = endStr
      ? new Date(endStr)
      : new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const report = await organizationService.generateReport(
      membership.org.id,
      startDate,
      endDate
    );

    if (!report) {
      return NextResponse.json(
        { error: "Failed to generate report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    logger.error("Error generating organization report", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
