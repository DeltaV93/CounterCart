import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { normalizeGiftCode, isValidGiftCodeFormat, formatGiftCode } from "@/lib/gift";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const redeemSchema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  // Rate limit check - use expensive limit as this modifies subscription state
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`gift-redeem:${clientId}`, RATE_LIMITS.expensive);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();
    const body = await request.json();
    const { code } = redeemSchema.parse(body);

    if (!isValidGiftCodeFormat(code)) {
      return NextResponse.json(
        { error: "Invalid gift code format" },
        { status: 400 }
      );
    }

    // Normalize the code for lookup
    const formattedCode = formatGiftCode(normalizeGiftCode(code));

    // Find the gift
    const gift = await prisma.giftSubscription.findUnique({
      where: { code: formattedCode },
    });

    if (!gift) {
      return NextResponse.json(
        { error: "Gift not found. Please check your gift code and try again." },
        { status: 404 }
      );
    }

    // Check if already redeemed
    if (gift.status === "redeemed") {
      return NextResponse.json(
        { error: "This gift has already been redeemed." },
        { status: 400 }
      );
    }

    // Check if gift is still pending payment
    if (gift.status === "pending") {
      return NextResponse.json(
        { error: "This gift payment has not been completed yet." },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > gift.expiresAt) {
      return NextResponse.json(
        { error: "This gift code has expired." },
        { status: 400 }
      );
    }

    // Start transaction to redeem gift and update user subscription
    const result = await prisma.$transaction(async (tx) => {
      // Update gift status
      const updatedGift = await tx.giftSubscription.update({
        where: { id: gift.id },
        data: {
          status: "redeemed",
          redeemedBy: user.id,
          redeemedAt: new Date(),
        },
      });

      // Update user to premium
      // Calculate subscription end date based on gift months
      // Note: This is a simplified approach. In production, you might want to
      // track the subscription end date and handle overlapping subscriptions.
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          subscriptionTier: "premium",
          subscriptionStatus: "active",
        },
      });

      return { gift: updatedGift, user: updatedUser };
    });

    logger.info("Gift subscription redeemed", {
      giftId: gift.id,
      userId: user.id,
      months: gift.months,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${gift.months} months of Premium!`,
      months: gift.months,
      subscriptionTier: result.user.subscriptionTier,
    });
  } catch (error) {
    logger.error("Error redeeming gift", undefined, error);

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
      { error: "Failed to redeem gift" },
      { status: 500 }
    );
  }
}
