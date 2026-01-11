import { NextResponse } from "next/server";
import Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
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

    default:
      logger.debug("Unhandled Stripe event type", { eventType: event.type });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const userId = session.client_reference_id;

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

  logger.warn("User payment failed", { userId: user.id });
}
