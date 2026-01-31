import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const user = await requireUser();

    // Check if user is premium
    if (user.subscriptionTier !== "premium") {
      return NextResponse.json(
        { error: "Tax summary is a Premium feature" },
        { status: 403 }
      );
    }

    // Get year from query params
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    // Validate year
    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      return NextResponse.json(
        { error: "Invalid year" },
        { status: 400 }
      );
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Fetch completed donations for the year
    const donations = await prisma.donation.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        charity: {
          select: {
            name: true,
            ein: true,
            everyOrgSlug: true,
          },
        },
      },
      orderBy: { completedAt: "asc" },
    });

    // Group donations by charity
    const byCharity = donations.reduce((acc, donation) => {
      const key = donation.charityId;
      if (!acc[key]) {
        acc[key] = {
          charityName: donation.charity.name,
          ein: donation.charity.ein,
          everyOrgSlug: donation.charity.everyOrgSlug,
          totalAmount: 0,
          donationCount: 0,
          donations: [],
        };
      }
      acc[key].totalAmount += Number(donation.amount);
      acc[key].donationCount += 1;
      acc[key].donations.push({
        date: donation.completedAt?.toISOString().split("T")[0],
        amount: Number(donation.amount),
      });
      return acc;
    }, {} as Record<string, {
      charityName: string;
      ein: string | null;
      everyOrgSlug: string;
      totalAmount: number;
      donationCount: number;
      donations: { date: string | undefined; amount: number }[];
    }>);

    const charities = Object.values(byCharity).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalDonated = charities.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalDonations = charities.reduce((sum, c) => sum + c.donationCount, 0);

    // Get monthly breakdown
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const monthDonations = donations.filter((d) => {
        const month = d.completedAt?.getMonth();
        return month === i;
      });
      return {
        month: new Date(year, i).toLocaleString("default", { month: "short" }),
        total: monthDonations.reduce((sum, d) => sum + Number(d.amount), 0),
        count: monthDonations.length,
      };
    });

    const taxSummary = {
      year,
      userName: user.name || user.email,
      userEmail: user.email,
      generatedAt: new Date().toISOString(),
      summary: {
        totalDonated,
        totalDonations,
        charitiesSupported: charities.length,
      },
      charities,
      monthlyBreakdown,
    };

    logger.info("Tax summary generated", { userId: user.id, year });

    return NextResponse.json(taxSummary);
  } catch (error) {
    logger.error("Error generating tax summary", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to generate tax summary" },
      { status: 500 }
    );
  }
}
