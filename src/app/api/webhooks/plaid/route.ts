import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { plaidService } from "@/services/plaid.service";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

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

    // Handle different webhook types
    try {
      switch (payload.webhook_type) {
        case "TRANSACTIONS":
          await handleTransactionsWebhook(payload);
          break;

        case "ITEM":
          await handleItemWebhook(payload);
          break;

        default:
          logger.debug("Unhandled webhook type", { webhookType: payload.webhook_type });
      }

      // Mark webhook as completed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });
    } catch (error) {
      // Mark webhook as failed
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
    logger.error("Error processing Plaid webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleTransactionsWebhook(payload: PlaidWebhookPayload) {
  const { webhook_code, item_id } = payload;

  // Find the PlaidItem
  const plaidItem = await prisma.plaidItem.findUnique({
    where: { itemId: item_id },
  });

  if (!plaidItem) {
    logger.error("PlaidItem not found for item_id", { itemId: item_id });
    return;
  }

  switch (webhook_code) {
    case "SYNC_UPDATES_AVAILABLE":
    case "INITIAL_UPDATE":
    case "HISTORICAL_UPDATE":
    case "DEFAULT_UPDATE":
      // Sync transactions
      await plaidService.syncTransactions(plaidItem.id);
      break;

    case "TRANSACTIONS_REMOVED":
      // Transactions were removed, sync will handle this
      await plaidService.syncTransactions(plaidItem.id);
      break;

    default:
      logger.debug("Unhandled transactions webhook code", { webhookCode: webhook_code });
  }
}

async function handleItemWebhook(payload: PlaidWebhookPayload) {
  const { webhook_code, item_id, error } = payload;

  // Find the PlaidItem
  const plaidItem = await prisma.plaidItem.findUnique({
    where: { itemId: item_id },
  });

  if (!plaidItem) {
    logger.error("PlaidItem not found for item_id", { itemId: item_id });
    return;
  }

  switch (webhook_code) {
    case "ERROR":
      // Update item status
      await prisma.plaidItem.update({
        where: { id: plaidItem.id },
        data: {
          status: "ERROR",
          errorCode: error?.error_code,
        },
      });
      break;

    case "PENDING_EXPIRATION":
      // Item access is about to expire
      await prisma.plaidItem.update({
        where: { id: plaidItem.id },
        data: {
          status: "LOGIN_REQUIRED",
        },
      });
      break;

    case "USER_PERMISSION_REVOKED":
      // User revoked access
      await prisma.plaidItem.update({
        where: { id: plaidItem.id },
        data: {
          status: "DISCONNECTED",
        },
      });
      break;

    default:
      logger.debug("Unhandled item webhook code", { webhookCode: webhook_code });
  }
}
