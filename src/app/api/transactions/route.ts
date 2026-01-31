import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { TransactionStatus, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as TransactionStatus | "all" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      userId: user.id,
    };

    // Search filter
    if (search) {
      where.merchantName = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Build orderBy
    const orderBy: Prisma.TransactionOrderByWithRelationInput = {};
    if (sortBy === "amount") {
      orderBy.amount = sortOrder as "asc" | "desc";
    } else if (sortBy === "merchant") {
      orderBy.merchantName = sortOrder as "asc" | "desc";
    } else {
      orderBy.date = sortOrder as "asc" | "desc";
    }

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        matchedMapping: {
          include: { cause: true },
        },
        donation: {
          select: {
            id: true,
            amount: true,
            status: true,
            charityName: true,
          },
        },
      },
    });

    // Format response
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      merchantName: tx.merchantName,
      amount: Number(tx.amount),
      date: tx.date.toISOString().split("T")[0],
      status: tx.status,
      category: tx.category,
      matchedMapping: tx.matchedMapping
        ? {
            charityName: tx.matchedMapping.charityName,
            causeName: tx.matchedMapping.cause.name,
          }
        : null,
      donation: tx.donation
        ? {
            id: tx.donation.id,
            amount: Number(tx.donation.amount),
            status: tx.donation.status,
            charityName: tx.donation.charityName,
          }
        : null,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("Error fetching transactions", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
