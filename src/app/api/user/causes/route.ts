import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const saveCausesSchema = z.object({
  causeIds: z.array(z.string()).min(1),
});

export async function GET() {
  try {
    const user = await requireUser();

    const userCauses = await prisma.userCause.findMany({
      where: { userId: user.id },
      include: { cause: true },
    });

    return NextResponse.json(userCauses);
  } catch (error) {
    logger.error("Error fetching user causes", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch user causes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { causeIds } = saveCausesSchema.parse(body);

    // Delete existing user causes
    await prisma.userCause.deleteMany({
      where: { userId: user.id },
    });

    // Create new user causes
    await prisma.userCause.createMany({
      data: causeIds.map((causeId, index) => ({
        userId: user.id,
        causeId,
        priority: index + 1,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error saving user causes", undefined, error);
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
      { error: "Failed to save user causes" },
      { status: 500 }
    );
  }
}
