import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import Stripe from "stripe";
import {
  FISCAL_SPONSOR,
  getDonationMemo,
} from "@/config/fiscal-sponsor";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const requestSchema = z.object({
  donationId: z.string(),
});

/**
 * Generate a donation checkout URL
 *
 * Donations go directly to Tech by Choice via Stripe.
 * TBC then grants funds to charities based on user's designated causes.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { donationId } = requestSchema.parse(body);

    // Verify the donation belongs to this user
    const donation = await prisma.donation.findFirst({
      where: {
        id: donationId,
        userId: user.id,
        status: "PENDING",
      },
      include: {
        designatedCause: true,
      },
    });

    if (!donation) {
      return NextResponse.json(
        { error: "Donation not found or already completed" },
        { status: 404 }
      );
    }

    // Mark donation as processing
    await prisma.donation.update({
      where: { id: donationId },
      data: { status: "PROCESSING" },
    });

    // Get cause name for description
    const causeName = donation.designatedCause?.name || "general";

    // Create Stripe Checkout session for direct donation to TBC
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `CounterCart Offset Donation`,
              description: getDonationMemo(causeName),
            },
            unit_amount: Math.round(donation.amount.toNumber() * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "offset_donation",
        donationId: donation.id,
        userId: user.id,
        batchId: donation.batchId || "",
        designatedCause: causeName,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donations?completed=${donationId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donations?canceled=${donationId}`,
      // Pre-fill customer email
      customer_email: user.email,
    });

    logger.info("Created Stripe checkout for donation", {
      donationId,
      sessionId: session.id,
      fiscalSponsor: FISCAL_SPONSOR.name,
      designatedCause: causeName,
      amount: donation.amount.toNumber(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("Error generating donation URL", undefined, error);
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
      { error: "Failed to generate donation URL" },
      { status: 500 }
    );
  }
}
