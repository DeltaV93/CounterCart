import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const user = await requireUser();

    // Fetch all user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userCauses: {
          include: {
            cause: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        userCharities: {
          include: {
            charity: {
              select: {
                name: true,
                everyOrgSlug: true,
              },
            },
          },
        },
        plaidItems: {
          select: {
            institutionName: true,
            status: true,
            createdAt: true,
            bankAccounts: {
              select: {
                name: true,
                type: true,
                subtype: true,
                mask: true,
                isActive: true,
              },
            },
          },
        },
        transactions: {
          select: {
            merchantName: true,
            amount: true,
            date: true,
            category: true,
            status: true,
            createdAt: true,
          },
          orderBy: { date: "desc" },
        },
        donations: {
          select: {
            charityName: true,
            charitySlug: true,
            amount: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Format the export data
    const exportData = {
      exportDate: new Date().toISOString(),
      profile: {
        email: userData.email,
        name: userData.name,
        subscriptionTier: userData.subscriptionTier,
        donationMultiplier: Number(userData.donationMultiplier),
        monthlyLimit: userData.monthlyLimit ? Number(userData.monthlyLimit) : null,
        autoDonateEnabled: userData.autoDonateEnabled,
        createdAt: userData.createdAt.toISOString(),
      },
      causes: userData.userCauses.map((uc) => ({
        name: uc.cause.name,
        slug: uc.cause.slug,
        addedAt: uc.createdAt.toISOString(),
      })),
      charityPreferences: userData.userCharities.map((uc) => ({
        charityName: uc.charity.name,
        charitySlug: uc.charity.everyOrgSlug,
        selectedAt: uc.createdAt.toISOString(),
      })),
      connectedAccounts: userData.plaidItems.map((item) => ({
        institution: item.institutionName,
        status: item.status,
        connectedAt: item.createdAt.toISOString(),
        accounts: item.bankAccounts.map((acc) => ({
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype,
          lastFour: acc.mask,
          isActive: acc.isActive,
        })),
      })),
      transactions: userData.transactions.map((tx) => ({
        merchant: tx.merchantName,
        amount: Number(tx.amount),
        date: tx.date.toISOString().split("T")[0],
        categories: tx.category,
        status: tx.status,
        importedAt: tx.createdAt.toISOString(),
      })),
      donations: userData.donations.map((d) => ({
        charity: d.charityName,
        charitySlug: d.charitySlug,
        amount: Number(d.amount),
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        completedAt: d.completedAt?.toISOString() || null,
      })),
      summary: {
        totalTransactions: userData.transactions.length,
        totalDonations: userData.donations.length,
        totalDonated: userData.donations
          .filter((d) => d.status === "COMPLETED")
          .reduce((sum, d) => sum + Number(d.amount), 0),
      },
    };

    logger.info("User data export requested", { userId: user.id });

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="countercart-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error("Error exporting user data", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
