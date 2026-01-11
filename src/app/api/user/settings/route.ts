import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const updateSettingsSchema = z.object({
  donationMultiplier: z.number().min(0.5).max(10).optional(),
  monthlyLimit: z.number().min(5).max(10000).optional(),
  autoDonateEnabled: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      donationMultiplier: user.donationMultiplier,
      monthlyLimit: user.monthlyLimit,
      autoDonateEnabled: user.autoDonateEnabled,
      onboardingComplete: user.onboardingComplete,
    });
  } catch (error) {
    logger.error("Error fetching user settings", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.donationMultiplier !== undefined && {
          donationMultiplier: data.donationMultiplier,
        }),
        ...(data.monthlyLimit !== undefined && {
          monthlyLimit: data.monthlyLimit,
        }),
        ...(data.autoDonateEnabled !== undefined && {
          autoDonateEnabled: data.autoDonateEnabled,
        }),
        ...(data.onboardingComplete !== undefined && {
          onboardingComplete: data.onboardingComplete,
        }),
        ...(data.name !== undefined && { name: data.name }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        subscriptionTier: updatedUser.subscriptionTier,
        donationMultiplier: updatedUser.donationMultiplier,
        monthlyLimit: updatedUser.monthlyLimit,
        autoDonateEnabled: updatedUser.autoDonateEnabled,
        onboardingComplete: updatedUser.onboardingComplete,
      },
    });
  } catch (error) {
    logger.error("Error updating user settings", undefined, error);
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
      { error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}
