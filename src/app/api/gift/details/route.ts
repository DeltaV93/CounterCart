import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeGiftCode, isValidGiftCodeFormat, formatGiftCode } from "@/lib/gift";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`gift-details:${clientId}`, RATE_LIMITS.standard);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Gift code is required" },
        { status: 400 }
      );
    }

    if (!isValidGiftCodeFormat(code)) {
      return NextResponse.json(
        { error: "Invalid gift code format" },
        { status: 400 }
      );
    }

    // Normalize the code for lookup (stored with dashes)
    const formattedCode = formatGiftCode(normalizeGiftCode(code));

    const gift = await prisma.giftSubscription.findUnique({
      where: { code: formattedCode },
      include: {
        purchaser: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!gift) {
      return NextResponse.json(
        { error: "Gift not found. Please check your gift code and try again." },
        { status: 404 }
      );
    }

    // Don't expose sensitive info, but include what's needed for display
    return NextResponse.json({
      id: gift.id,
      code: gift.code,
      recipientEmail: maskEmail(gift.recipientEmail),
      recipientName: gift.personalMessage ? undefined : undefined, // Not stored separately
      purchaserName: gift.purchaser?.name || undefined,
      personalMessage: gift.personalMessage,
      months: gift.months,
      amount: Number(gift.amount),
      status: gift.status,
      expiresAt: gift.expiresAt.toISOString(),
      createdAt: gift.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching gift details", undefined, error);
    return NextResponse.json(
      { error: "Failed to fetch gift details" },
      { status: 500 }
    );
  }
}

/**
 * Mask email for privacy (e.g., j***@example.com)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;

  if (local.length <= 1) {
    return `*@${domain}`;
  }

  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
}
