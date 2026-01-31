import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const user = await requireUser();

    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: user.id },
      include: {
        bankAccounts: {
          select: {
            id: true,
            name: true,
            type: true,
            subtype: true,
            mask: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const accounts = plaidItems.map((item) => ({
      id: item.id,
      institutionName: item.institutionName,
      institutionId: item.institutionId,
      status: item.status,
      errorCode: item.errorCode,
      connectedAt: item.createdAt.toISOString(),
      accounts: item.bankAccounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        lastFour: acc.mask,
        isActive: acc.isActive,
      })),
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    logger.error("Error fetching bank accounts", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}

const disconnectSchema = z.object({
  plaidItemId: z.string(),
});

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { plaidItemId } = disconnectSchema.parse(body);

    // Verify the item belongs to the user
    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        id: plaidItemId,
        userId: user.id,
      },
    });

    if (!plaidItem) {
      return NextResponse.json(
        { error: "Bank connection not found" },
        { status: 404 }
      );
    }

    // Remove item from Plaid
    try {
      const accessToken = decrypt(plaidItem.accessToken);
      await plaidClient.itemRemove({ access_token: accessToken });
    } catch (error) {
      logger.error("Error removing Plaid item", {
        userId: user.id,
        itemId: plaidItem.itemId,
      }, error);
      // Continue with deletion even if Plaid API fails
    }

    // Delete from database (cascades to bank accounts)
    await prisma.plaidItem.delete({
      where: { id: plaidItemId },
    });

    logger.info("Bank connection removed", {
      userId: user.id,
      institutionName: plaidItem.institutionName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error disconnecting bank account", undefined, error);

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
      { error: "Failed to disconnect bank account" },
      { status: 500 }
    );
  }
}
