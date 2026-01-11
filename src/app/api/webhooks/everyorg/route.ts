import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// Every.org webhook payload structure
interface EveryOrgWebhookPayload {
  chargeId: string;
  partnerDonationId?: string;
  partnerMetadata?: {
    donationId?: string;
    batchId?: string;
    userId?: string;
  };
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  toNonprofit: {
    slug: string;
    ein?: string;
    name: string;
  };
  amount: string;
  netAmount: string;
  currency: string;
  frequency: "Monthly" | "One-time";
  donationDate: string;
  publicTestimony?: string;
  privateNote?: string;
  fromFundraiser?: {
    id: string;
    title: string;
    slug: string;
  };
  paymentMethod: string;
}

/**
 * Verify webhook signature if secret is configured
 * Every.org may provide HMAC signature - check headers
 */
function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.EVERYORG_WEBHOOK_SECRET;

  // If no secret configured, skip verification (not recommended for production)
  if (!secret) {
    logger.warn("EVERYORG_WEBHOOK_SECRET not configured - skipping signature verification");
    return true;
  }

  // If secret configured but no signature provided, reject
  if (!signatureHeader) {
    return false;
  }

  // Compute expected signature (standard HMAC-SHA256)
  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Handle different signature formats (with or without prefix)
  const providedSignature = signatureHeader.replace(/^sha256=/, "");

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const providedBuffer = Buffer.from(providedSignature, "hex");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`webhook-everyorg:${clientId}`, RATE_LIMITS.webhook);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const rawBody = await request.text();

    // Verify signature if configured
    const signatureHeader =
      request.headers.get("X-Signature") ||
      request.headers.get("X-Every-Signature") ||
      request.headers.get("X-Hub-Signature-256");

    if (!verifyWebhookSignature(rawBody, signatureHeader)) {
      logger.error("Every.org webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody) as EveryOrgWebhookPayload;

    // Log webhook event for debugging and idempotency
    const existingEvent = await prisma.webhookEvent.findFirst({
      where: {
        source: "every_org",
        eventId: payload.chargeId,
      },
    });

    if (existingEvent) {
      // Already processed this webhook
      return NextResponse.json({ received: true, status: "duplicate" });
    }

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: "every_org",
        eventType: "donation.completed",
        eventId: payload.chargeId,
        payload: payload as object,
        status: "PENDING",
      },
    });

    try {
      await handleDonationCompleted(payload);

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
          retryCount: { increment: 1 },
        },
      });
      throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Every.org webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleDonationCompleted(payload: EveryOrgWebhookPayload) {
  // Try to find the donation by partnerMetadata first
  let donation = null;

  if (payload.partnerMetadata?.donationId) {
    donation = await prisma.donation.findUnique({
      where: { id: payload.partnerMetadata.donationId },
    });
  }

  // Fallback: find by charity slug and pending status for the user
  if (!donation && payload.partnerMetadata?.userId) {
    donation = await prisma.donation.findFirst({
      where: {
        userId: payload.partnerMetadata.userId,
        charitySlug: payload.toNonprofit.slug,
        status: "PENDING",
        amount: parseFloat(payload.amount),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Fallback: find by everyOrgId if already set
  if (!donation) {
    donation = await prisma.donation.findUnique({
      where: { everyOrgId: payload.chargeId },
    });
  }

  if (!donation) {
    // This might be a donation made directly on Every.org, not through our app
    logger.info("No matching donation found for Every.org charge", {
      chargeId: payload.chargeId,
      charitySlug: payload.toNonprofit.slug,
    });
    return;
  }

  // Update donation status
  await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "COMPLETED",
      everyOrgId: payload.chargeId,
      receiptUrl: `https://www.every.org/receipt/${payload.chargeId}`,
      completedAt: new Date(payload.donationDate),
    },
  });

  // Update related transaction status if exists
  if (donation.transactionId) {
    await prisma.transaction.update({
      where: { id: donation.transactionId },
      data: { status: "DONATED" },
    });
  }

  // Update batch status if all donations in batch are completed
  if (donation.batchId) {
    const pendingInBatch = await prisma.donation.count({
      where: {
        batchId: donation.batchId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (pendingInBatch === 0) {
      await prisma.donationBatch.update({
        where: { id: donation.batchId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });
    }
  }

  logger.info("Donation marked as completed", {
    donationId: donation.id,
    everyOrgChargeId: payload.chargeId,
  });
}
