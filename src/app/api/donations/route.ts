import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const user = await requireUser();

    const donations = await prisma.donation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      donations.map((d) => ({
        id: d.id,
        charitySlug: d.charitySlug,
        charityName: d.charityName,
        amount: d.amount.toNumber(),
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        completedAt: d.completedAt?.toISOString() || null,
      }))
    );
  } catch (error) {
    logger.error("Error fetching donations", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}
