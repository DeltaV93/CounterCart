import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";
import { plaidService } from "@/services/plaid.service";
import { sendBankReconnectEmail } from "@/lib/email";
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

/**
 * Process Plaid webhook inline when no backend service is configured
 */
async function processPlaidWebhookInline(
  payload: PlaidWebhookPayload,
  webhookEventId: string
) {
  try {
    const { webhook_type, webhook_code, item_id } = payload;

    // Find the PlaidItem by Plaid's item_id
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { itemId: item_id },
      include: { user: true },
    });

    if (!plaidItem) {
      logger.error("PlaidItem not found for webhook", { itemId: item_id });
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: "FAILED", error: "PlaidItem not found" },
      });
      return;
    }

    if (webhook_type === "TRANSACTIONS") {
      switch (webhook_code) {
        case "SYNC_UPDATES_AVAILABLE":
        case "INITIAL_UPDATE":
        case "HISTORICAL_UPDATE":
        case "DEFAULT_UPDATE": {
          const stats = await plaidService.syncTransactions(plaidItem.id);
          logger.info("Plaid transactions synced inline", {
            plaidItemId: plaidItem.id,
            stats,
          });
          break;
        }
        default:
          logger.debug("Unhandled transaction webhook code", { webhook_code });
      }
    } else if (webhook_type === "ITEM") {
      switch (webhook_code) {
        case "ERROR":
        case "LOGIN_REQUIRED": {
          await prisma.plaidItem.update({
            where: { id: plaidItem.id },
            data: {
              status: "LOGIN_REQUIRED",
              errorCode: payload.error?.error_code || webhook_code,
            },
          });
          // Notify user
          await sendBankReconnectEmail(
            plaidItem.user.email,
            plaidItem.user.name || undefined,
            plaidItem.institutionName,
            plaidItem.user.id
          );
          logger.info("PlaidItem marked as login required", {
            plaidItemId: plaidItem.id,
          });
          break;
        }
        case "PENDING_EXPIRATION":
          logger.warn("Plaid item pending expiration", {
            plaidItemId: plaidItem.id,
          });
          break;
        default:
          logger.debug("Unhandled item webhook code", { webhook_code });
      }
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "COMPLETED", processedAt: new Date() },
    });
  } catch (error) {
    logger.error("Error processing Plaid webhook inline", { webhookEventId }, error);
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: { increment: 1 },
      },
    });
  }
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

    // Trigger background job via FastAPI service if configured, otherwise process inline
    if (BACKEND_URL && INTERNAL_TOKEN) {
      fetch(`${BACKEND_URL}/jobs/handle-plaid-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": INTERNAL_TOKEN,
        },
        body: JSON.stringify({ webhook_event_id: webhookEvent.id }),
      }).catch((err) => {
        logger.error("Failed to trigger backend job, falling back to inline processing", { error: String(err) });
        // Fall back to inline processing if backend is unreachable
        processPlaidWebhookInline(payload, webhookEvent.id).catch((inlineErr) => {
          logger.error("Inline processing also failed", { error: String(inlineErr) });
        });
      });
    } else {
      // No backend service - process inline (non-blocking)
      processPlaidWebhookInline(payload, webhookEvent.id).catch((err) => {
        logger.error("Inline webhook processing failed", { error: String(err) });
      });
    }

    logger.info("Plaid webhook received", {
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
