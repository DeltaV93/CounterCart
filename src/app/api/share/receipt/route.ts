import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createUniqueReferralCode } from "@/lib/referral";

/**
 * GET /api/share/receipt
 * Get receipt data for sharing (last week's donations by default)
 */
export async function GET() {
  try {
    const user = await requireUser();

    // Ensure user has a referral code
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await createUniqueReferralCode();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    // Get last week's date range
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get completed donations from last week with transaction data
    // Include designatedCause for fiscal sponsor model
    const donations = await prisma.donation.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
        completedAt: {
          gte: oneWeekAgo,
          lte: now,
        },
      },
      include: {
        transaction: {
          include: {
            matchedMapping: true,
          },
        },
        charity: true,
        designatedCause: true,
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // If no completed donations, get pending ones
    if (donations.length === 0) {
      const pendingDonations = await prisma.donation.findMany({
        where: {
          userId: user.id,
          status: "PENDING",
        },
        include: {
          transaction: {
            include: {
              matchedMapping: true,
            },
          },
          charity: true,
          designatedCause: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      if (pendingDonations.length === 0) {
        return NextResponse.json(
          { error: "No donations to share" },
          { status: 404 }
        );
      }

      return formatReceiptResponse(pendingDonations, referralCode);
    }

    return formatReceiptResponse(donations, referralCode);
  } catch (error) {
    logger.error("Error fetching receipt data", {}, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatReceiptResponse(
  donations: Array<{
    charityName: string | null;
    fiscalSponsorName: string;
    amount: { toNumber(): number } | number;
    transaction: {
      merchantName: string;
      amount: { toNumber(): number } | number;
      matchedMapping: { merchantName: string } | null;
    } | null;
    charity: { name: string } | null;
    designatedCause: { name: string } | null;
  }>,
  referralCode: string
) {
  // Aggregate businesses
  const businessMap = new Map<string, number>();
  donations.forEach((d) => {
    if (d.transaction) {
      const name =
        d.transaction.matchedMapping?.merchantName || d.transaction.merchantName;
      const amount =
        typeof d.transaction.amount === "number"
          ? d.transaction.amount
          : d.transaction.amount.toNumber();
      businessMap.set(name, (businessMap.get(name) || 0) + amount);
    }
  });

  // Aggregate causes/charities
  // For fiscal sponsor model: use designated cause name
  // For legacy model: use charity name
  const causeSet = new Set<string>();
  donations.forEach((d) => {
    // Prefer designated cause (fiscal sponsor model)
    if (d.designatedCause?.name) {
      causeSet.add(d.designatedCause.name);
    } else if (d.charity?.name) {
      // Fall back to charity name (legacy)
      causeSet.add(d.charity.name);
    } else if (d.charityName) {
      // Fall back to stored charity name
      causeSet.add(d.charityName);
    }
  });

  // Calculate totals
  const totalSpent = Array.from(businessMap.values()).reduce(
    (sum, amt) => sum + amt,
    0
  );
  const totalDonated = donations.reduce(
    (sum, d) =>
      sum + (typeof d.amount === "number" ? d.amount : d.amount.toNumber()),
    0
  );

  // Format for response
  const businesses = Array.from(businessMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // "charities" now represents causes for fiscal sponsor model
  const charities = Array.from(causeSet)
    .map((name) => ({ name }))
    .slice(0, 5);

  // Get week of date
  const weekOf = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return NextResponse.json({
    businesses,
    charities,  // Now represents causes/charities depending on model
    totalSpent,
    totalDonated,
    referralCode,
    weekOf,
  });
}
