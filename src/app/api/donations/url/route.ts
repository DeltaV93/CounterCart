import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDonationUrl } from "@/lib/everyorg";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  donationId: z.string(),
});

/**
 * Generate a donation URL with proper tracking metadata
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

    // Generate URL with tracking metadata
    const donationUrl = getDonationUrl(donation.charitySlug, {
      amount: donation.amount.toNumber(),
      frequency: "ONCE",
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/donations?completed=${donationId}`,
      metadata: {
        donationId: donation.id,
        userId: user.id,
        batchId: donation.batchId || undefined,
      },
    });

    return NextResponse.json({ url: donationUrl });
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
