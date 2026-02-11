import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function GET(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`user-gifts:${clientId}`, RATE_LIMITS.standard);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();

    // Fetch gifts purchased by the user
    const purchased = await prisma.giftSubscription.findMany({
      where: {
        purchaserId: user.id,
      },
      include: {
        redeemer: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch gifts received (redeemed) by the user
    const received = await prisma.giftSubscription.findMany({
      where: {
        redeemedBy: user.id,
      },
      include: {
        purchaser: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        redeemedAt: "desc",
      },
    });

    // Format the response
    const formatGift = (gift: typeof purchased[number] | typeof received[number]) => ({
      id: gift.id,
      code: gift.code,
      recipientEmail: gift.recipientEmail,
      personalMessage: gift.personalMessage,
      amount: Number(gift.amount),
      months: gift.months,
      status: gift.status,
      sentAt: gift.sentAt?.toISOString() || null,
      redeemedAt: gift.redeemedAt?.toISOString() || null,
      expiresAt: gift.expiresAt.toISOString(),
      createdAt: gift.createdAt.toISOString(),
      redeemer: "redeemer" in gift ? gift.redeemer : undefined,
      purchaser: "purchaser" in gift ? gift.purchaser : undefined,
    });

    return NextResponse.json({
      purchased: purchased.map(formatGift),
      received: received.map(formatGift),
    });
  } catch (error) {
    logger.error("Error fetching user gifts", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch gifts" },
      { status: 500 }
    );
  }
}
