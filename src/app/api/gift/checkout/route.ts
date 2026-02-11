import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { generateGiftCode } from "@/lib/gift";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const checkoutSchema = z.object({
  months: z.number().int().positive().refine(
    (val) => [3, 6, 12].includes(val),
    { message: "Invalid gift duration. Must be 3, 6, or 12 months." }
  ),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  personalMessage: z.string().max(500).optional(),
  senderName: z.string().optional(),
});

// Pricing per month is $4.99
const PRICE_PER_MONTH = 4.99;

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`gift-checkout:${clientId}`, RATE_LIMITS.expensive);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();
    const body = await request.json();
    const data = checkoutSchema.parse(body);

    // Calculate total price
    const totalPrice = data.months * PRICE_PER_MONTH;
    const amountInCents = Math.round(totalPrice * 100);

    // Generate a unique gift code
    const giftCode = await generateGiftCode();

    // Calculate expiration date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Create gift subscription record (pending status until payment completes)
    const gift = await prisma.giftSubscription.create({
      data: {
        code: giftCode,
        purchaserId: user.id,
        recipientEmail: data.recipientEmail.toLowerCase(),
        personalMessage: data.personalMessage,
        amount: totalPrice,
        months: data.months,
        status: "pending",
        expiresAt,
      },
    });

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";

    // Create Stripe checkout session (payment mode, not subscription)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: {
              name: `CounterCart Premium Gift - ${data.months} Months`,
              description: `${data.months}-month Premium membership gift for ${data.recipientEmail}`,
              images: [`${appUrl}/og-image.png`],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "gift_subscription",
        giftId: gift.id,
        recipientEmail: data.recipientEmail.toLowerCase(),
        recipientName: data.recipientName || "",
        senderName: data.senderName || user.name || "",
        personalMessage: data.personalMessage || "",
        months: String(data.months),
      },
      success_url: `${appUrl}/gifts?purchase=success&code=${giftCode}`,
      cancel_url: `${appUrl}/gift?purchase=cancelled`,
    });

    logger.info("Gift checkout session created", {
      userId: user.id,
      giftId: gift.id,
      months: data.months,
      recipientEmail: data.recipientEmail,
      sessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("Error creating gift checkout session", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
