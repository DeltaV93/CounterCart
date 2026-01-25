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

const BACKEND_URL = process.env.BACKEND_SERVICE_URL;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;

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

    // Trigger background job via FastAPI service
    if (BACKEND_URL && INTERNAL_TOKEN) {
      fetch(`${BACKEND_URL}/jobs/complete-donation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": INTERNAL_TOKEN,
        },
        body: JSON.stringify({
          donation_id: payload.partnerMetadata?.donationId,
          batch_id: payload.partnerMetadata?.batchId,
          user_id: payload.partnerMetadata?.userId,
          every_org_id: payload.chargeId,
        }),
      }).catch((err) => {
        logger.error("Failed to trigger backend job", { error: String(err) });
      });

      // Mark webhook as processing (will be completed by background job)
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "PROCESSING" },
      });
    } else {
      logger.warn("Backend service not configured, donation will not be processed");
    }

    logger.info("Every.org webhook queued for processing", {
      eventId: webhookEvent.id,
      chargeId: payload.chargeId,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Every.org webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
