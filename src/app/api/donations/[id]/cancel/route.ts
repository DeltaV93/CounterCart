import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Find the donation and verify ownership
    const donation = await prisma.donation.findUnique({
      where: { id },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    if (donation.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only allow canceling pending donations
    if (donation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending donations can be cancelled" },
        { status: 400 }
      );
    }

    // Update the linked transaction status back to MATCHED if there is one
    if (donation.transactionId) {
      await prisma.transaction.update({
        where: { id: donation.transactionId },
        data: { status: "SKIPPED" },
      });
    }

    // Delete the donation record
    await prisma.donation.delete({
      where: { id },
    });

    logger.info("Donation cancelled", {
      userId: user.id,
      donationId: id,
      charityName: donation.charityName,
      amount: donation.amount.toString(),
    });

    return NextResponse.json({
      success: true,
      message: "Donation cancelled successfully",
    });
  } catch (error) {
    logger.error("Error cancelling donation", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to cancel donation" },
      { status: 500 }
    );
  }
}
