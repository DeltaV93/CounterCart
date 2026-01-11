import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const causes = await prisma.cause.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(causes);
  } catch (error) {
    logger.error("Error fetching causes", undefined, error);
    return NextResponse.json(
      { error: "Failed to fetch causes" },
      { status: 500 }
    );
  }
}
