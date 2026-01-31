import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const user = await requireUser();

    // Get donations by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const donations = await prisma.donation.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
        completedAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        completedAt: true,
        charityName: true,
      },
    });

    // Group donations by month
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData[key] = 0;
    }

    donations.forEach((donation) => {
      if (donation.completedAt) {
        const key = donation.completedAt.toISOString().slice(0, 7);
        if (monthlyData[key] !== undefined) {
          monthlyData[key] += Number(donation.amount);
        }
      }
    });

    const monthlyDonations = Object.entries(monthlyData).map(([month, amount]) => {
      const date = new Date(month + "-01");
      return {
        month: date.toLocaleDateString("en-US", { month: "short" }),
        amount: Math.round(amount * 100) / 100,
      };
    });

    // Get donations by charity/cause for breakdown
    const charityBreakdown: Record<string, number> = {};
    donations.forEach((donation) => {
      const charity = donation.charityName || "Unknown";
      charityBreakdown[charity] = (charityBreakdown[charity] || 0) + Number(donation.amount);
    });

    const charityData = Object.entries(charityBreakdown)
      .map(([name, amount]) => ({
        name: name.length > 20 ? name.slice(0, 17) + "..." : name,
        value: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 charities

    // Get cause breakdown from user's causes and their donations
    const userCauses = await prisma.userCause.findMany({
      where: { userId: user.id },
      include: {
        cause: true,
      },
    });

    const causeDonations = await prisma.donation.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
      },
      include: {
        charity: {
          include: {
            cause: true,
          },
        },
      },
    });

    const causeBreakdown: Record<string, { name: string; amount: number; color: string }> = {};

    causeDonations.forEach((donation) => {
      if (donation.charity?.cause) {
        const cause = donation.charity.cause;
        if (!causeBreakdown[cause.id]) {
          causeBreakdown[cause.id] = {
            name: cause.name,
            amount: 0,
            color: cause.color || "#8884d8",
          };
        }
        causeBreakdown[cause.id].amount += Number(donation.amount);
      }
    });

    const causeData = Object.values(causeBreakdown)
      .map((c) => ({
        name: c.name.length > 15 ? c.name.slice(0, 12) + "..." : c.name,
        value: Math.round(c.amount * 100) / 100,
        color: c.color,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate impact metrics
    const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const averageDonation = donations.length > 0 ? totalDonated / donations.length : 0;
    const thisMonthKey = now.toISOString().slice(0, 7);
    const thisMonthDonations = monthlyData[thisMonthKey] || 0;

    return NextResponse.json({
      monthlyDonations,
      charityData,
      causeData,
      summary: {
        totalDonated: Math.round(totalDonated * 100) / 100,
        averageDonation: Math.round(averageDonation * 100) / 100,
        thisMonthDonations: Math.round(thisMonthDonations * 100) / 100,
        causesSupported: userCauses.length,
        charitiesSupported: Object.keys(charityBreakdown).length,
      },
    });
  } catch (error) {
    logger.error("Error fetching dashboard stats", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
