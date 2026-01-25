import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const BACKEND_URL = process.env.BACKEND_SERVICE_URL;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;

// Webhook types from Plaid
interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_code: string;
    error_message: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
}

export async function POST(request: Request) {
  // Rate limit check for webhooks
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`webhook-plaid:${clientId}`, RATE_LIMITS.webhook);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    const plaidVerificationHeader = request.headers.get("Plaid-Verification");
    const verification = await verifyPlaidWebhook(rawBody, plaidVerificationHeader);

    if (!verification.valid) {
      logger.error("Plaid webhook verification failed", { error: verification.error });
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 401 }
      );
    }

    // Parse body after verification
    const payload = JSON.parse(rawBody) as PlaidWebhookPayload;

    // Log webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: "plaid",
        eventType: `${payload.webhook_type}.${payload.webhook_code}`,
        eventId: `${payload.item_id}-${Date.now()}`,
        payload: payload as object,
        status: "PENDING",
      },
    });

    // Trigger background job via FastAPI service
    if (BACKEND_URL && INTERNAL_TOKEN) {
      fetch(`${BACKEND_URL}/jobs/handle-plaid-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": INTERNAL_TOKEN,
        },
        body: JSON.stringify({ webhook_event_id: webhookEvent.id }),
      }).catch((err) => {
        logger.error("Failed to trigger backend job", { error: String(err) });
      });
    } else {
      logger.warn("Backend service not configured, webhook will not be processed");
    }

    logger.info("Plaid webhook queued for processing", {
      eventId: webhookEvent.id,
      webhookType: payload.webhook_type,
      webhookCode: payload.webhook_code,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Plaid webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
