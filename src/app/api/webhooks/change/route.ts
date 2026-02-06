import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  ChangeWebhookEvent,
} from "@/lib/change";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    `webhook-change:${clientId}`,
    RATE_LIMITS.webhook
  );
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-change-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-change-signature header" },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.error("Change webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event: ChangeWebhookEvent;
    try {
      event = parseWebhookEvent(rawBody);
    } catch {
      logger.error("Failed to parse Change webhook payload");
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Check for duplicate event
    const existingEvent = await prisma.webhookEvent.findFirst({
      where: {
        source: "change",
        eventId: event.data.id,
      },
    });

    if (existingEvent) {
      return NextResponse.json({ received: true, status: "duplicate" });
    }

    // Log webhook event for idempotency
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: "change",
        eventType: event.type,
        eventId: event.data.id,
        payload: event as unknown as object,
        status: "PENDING",
      },
    });

    try {
      await handleChangeEvent(event);

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
    logger.error("Error processing Change webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleChangeEvent(event: ChangeWebhookEvent) {
  switch (event.type) {
    case "donation.completed":
      await handleDonationCompleted(event);
      break;

    case "donation.failed":
      await handleDonationFailed(event);
      break;

    default:
      logger.debug("Unhandled Change event type", { eventType: event.type });
  }
}

async function handleDonationCompleted(event: ChangeWebhookEvent) {
  const { id, metadata, receipt_url, completed_at } = event.data;

  // Find donation by Change ID
  let donation = await prisma.donation.findUnique({
    where: { changeId: id },
  });

  // If not found by changeId, try to find by metadata
  if (!donation && metadata?.donationId) {
    donation = await prisma.donation.findUnique({
      where: { id: metadata.donationId },
    });
  }

  if (!donation) {
    logger.warn("No matching donation found for Change completion", {
      changeId: id,
      metadata,
    });
    return;
  }

  // Update donation status
  await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "COMPLETED",
      changeId: id,
      receiptUrl: receipt_url || donation.receiptUrl,
      completedAt: completed_at ? new Date(completed_at) : new Date(),
    },
  });

  // Update linked transaction
  if (donation.transactionId) {
    await prisma.transaction.update({
      where: { id: donation.transactionId },
      data: { status: "DONATED" },
    });
  }

  // Check if batch is complete
  if (donation.batchId) {
    const pendingCount = await prisma.donation.count({
      where: {
        batchId: donation.batchId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (pendingCount === 0) {
      await prisma.donationBatch.update({
        where: { id: donation.batchId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });

      logger.info("Donation batch completed", { batchId: donation.batchId });
    }
  }

  logger.info("Change donation completed", {
    donationId: donation.id,
    changeId: id,
  });
}

async function handleDonationFailed(event: ChangeWebhookEvent) {
  const { id, metadata, error_message } = event.data;

  // Find donation by Change ID
  let donation = await prisma.donation.findUnique({
    where: { changeId: id },
  });

  // If not found by changeId, try to find by metadata
  if (!donation && metadata?.donationId) {
    donation = await prisma.donation.findUnique({
      where: { id: metadata.donationId },
    });
  }

  if (!donation) {
    logger.warn("No matching donation found for Change failure", {
      changeId: id,
      metadata,
    });
    return;
  }

  // Update donation status
  await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "FAILED",
      changeId: id,
      errorMessage: error_message || "Donation failed",
    },
  });

  // Update linked transaction
  if (donation.transactionId) {
    await prisma.transaction.update({
      where: { id: donation.transactionId },
      data: { status: "FAILED" },
    });
  }

  logger.error("Change donation failed", {
    donationId: donation.id,
    changeId: id,
    error: error_message,
  });
}
