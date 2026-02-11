import { NextResponse } from "next/server";
import Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendPaymentFailedEmail, sendGiftReceivedEmail } from "@/lib/email";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`webhook-stripe:${clientId}`, RATE_LIMITS.webhook);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 401 }
      );
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(rawBody, signature);
    } catch (err) {
      logger.error("Stripe webhook signature verification failed", undefined, err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Log webhook event for idempotency
    const existingEvent = await prisma.webhookEvent.findFirst({
      where: {
        source: "stripe",
        eventId: event.id,
      },
    });

    if (existingEvent) {
      return NextResponse.json({ received: true, status: "duplicate" });
    }

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: "stripe",
        eventType: event.type,
        eventId: event.id,
        payload: event as unknown as object,
        status: "PENDING",
      },
    });

    try {
      await handleStripeEvent(event);

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
    logger.error("Error processing Stripe webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    // ACH payment events for auto-donations
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    default:
      logger.debug("Unhandled Stripe event type", { eventType: event.type });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const userId = session.client_reference_id || session.metadata?.userId;

  // Check if this is a gift subscription purchase
  if (session.metadata?.type === "gift_subscription") {
    await handleGiftCheckoutCompleted(session);
    return;
  }

  // Check if this is an offset donation (direct to fiscal sponsor)
  if (session.metadata?.type === "offset_donation") {
    await handleOffsetDonationCompleted(session);
    return;
  }

  if (!userId) {
    logger.error("No client_reference_id in checkout session", { sessionId: session.id });
    return;
  }

  // Link Stripe customer to user if not already linked
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

/**
 * Handle offset donation checkout completion
 * Donation goes directly to Tech by Choice via Stripe
 */
async function handleOffsetDonationCompleted(session: Stripe.Checkout.Session) {
  const donationId = session.metadata?.donationId;
  const userId = session.metadata?.userId;
  const designatedCause = session.metadata?.designatedCause;

  if (!donationId) {
    logger.error("No donationId in offset donation session metadata", { sessionId: session.id });
    return;
  }

  // Mark donation as completed
  const donation = await prisma.donation.update({
    where: { id: donationId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      // Store Stripe payment ID for reference
      everyOrgId: session.payment_intent as string, // Repurposing this field for Stripe payment ID
    },
  });

  // Update linked transaction if exists
  if (donation.transactionId) {
    await prisma.transaction.update({
      where: { id: donation.transactionId },
      data: { status: "DONATED" },
    });
  }

  // Check if this completes a batch
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

  logger.info("Offset donation completed - funds received by fiscal sponsor", {
    donationId,
    userId,
    designatedCause,
    amount: session.amount_total ? session.amount_total / 100 : null,
    paymentIntent: session.payment_intent,
  });
}

async function handleGiftCheckoutCompleted(session: Stripe.Checkout.Session) {
  const giftId = session.metadata?.giftId;
  const recipientEmail = session.metadata?.recipientEmail;
  const recipientName = session.metadata?.recipientName;
  const senderName = session.metadata?.senderName;
  const personalMessage = session.metadata?.personalMessage;
  const months = parseInt(session.metadata?.months || "12", 10);

  if (!giftId) {
    logger.error("No giftId in gift checkout session metadata", { sessionId: session.id });
    return;
  }

  // Update gift status to "sent" and record payment
  const gift = await prisma.giftSubscription.update({
    where: { id: giftId },
    data: {
      status: "sent",
      stripePaymentId: session.payment_intent as string,
      sentAt: new Date(),
    },
  });

  logger.info("Gift subscription payment completed", {
    giftId,
    recipientEmail,
    months,
    paymentIntent: session.payment_intent,
  });

  // Send gift notification email to recipient
  if (recipientEmail) {
    await sendGiftReceivedEmail(
      recipientEmail,
      {
        code: gift.code,
        months,
        senderName: senderName || undefined,
        recipientName: recipientName || undefined,
        personalMessage: personalMessage || undefined,
      }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("No user found for Stripe customer", { customerId });
    return;
  }

  // Determine tier based on subscription status and price
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const premiumPriceId = process.env.STRIPE_PRICE_ID_PREMIUM;

  const isPremium =
    isActive &&
    subscription.items.data.some((item) => item.price.id === premiumPriceId);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: isPremium ? "premium" : "free",
      subscriptionStatus: subscription.status,
    },
  });

  logger.info("Updated user subscription", {
    userId: user.id,
    tier: isPremium ? "premium" : "free",
    status: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("No user found for Stripe customer", { customerId });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: "free",
      subscriptionStatus: "canceled",
    },
  });

  logger.info("User subscription canceled", { userId: user.id });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("No user found for Stripe customer", { customerId });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "past_due",
    },
  });

  // Send payment failed email notification
  await sendPaymentFailedEmail(user.email, user.name || undefined);

  logger.warn("User payment failed", { userId: user.id });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const batchId = paymentIntent.metadata?.batch_id;

  if (!batchId) {
    // Not an auto-donation payment, ignore
    return;
  }

  // Check if batch exists
  const batchExists = await prisma.donationBatch.findUnique({
    where: { id: batchId },
    select: { id: true },
  });

  if (!batchExists) {
    logger.warn("No batch found for payment intent", {
      paymentIntentId: paymentIntent.id,
      batchId,
    });
    return;
  }

  // Update batch with successful payment
  await prisma.donationBatch.update({
    where: { id: batchId },
    data: {
      stripePaymentStatus: "succeeded",
      achDebitedAt: new Date(),
    },
  });

  logger.info("ACH payment succeeded for batch", {
    batchId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
  });

  // Trigger grant distribution to charities via Every.org Partner API
  try {
    const backendUrl = process.env.BACKEND_SERVICE_URL;
    const internalToken = process.env.INTERNAL_API_TOKEN;

    if (backendUrl && internalToken) {
      const response = await fetch(`${backendUrl}/jobs/distribute-grants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": internalToken,
        },
        body: JSON.stringify({ batch_id: batchId }),
      });

      if (!response.ok) {
        logger.error("Failed to trigger grant distribution", {
          batchId,
          status: response.status,
          statusText: response.statusText,
        });
      } else {
        logger.info("Grant distribution triggered", { batchId });
      }
    } else {
      logger.warn("Backend service not configured, skipping grant distribution", {
        batchId,
        hasBackendUrl: !!backendUrl,
        hasToken: !!internalToken,
      });
    }
  } catch (error) {
    logger.error("Error triggering grant distribution", { batchId }, error);
    // Don't throw - ACH payment succeeded, grant distribution can be retried
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const batchId = paymentIntent.metadata?.batch_id;
  const userId = paymentIntent.metadata?.user_id;

  if (!batchId) {
    // Not an auto-donation payment, ignore
    return;
  }

  // Update the batch status
  const batch = await prisma.donationBatch.update({
    where: { id: batchId },
    data: {
      status: "FAILED",
      stripePaymentStatus: "failed",
    },
  });

  // Mark all donations in the batch as failed
  await prisma.donation.updateMany({
    where: { batchId },
    data: {
      status: "FAILED",
      errorMessage: paymentIntent.last_payment_error?.message || "ACH payment failed",
    },
  });

  // Send notification to user
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.notifyPaymentFailed) {
      await sendPaymentFailedEmail(user.email, user.name || undefined);
    }
  }

  logger.error("ACH payment failed for batch", {
    batchId,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });
}
