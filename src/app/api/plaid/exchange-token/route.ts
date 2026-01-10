import { NextResponse } from "next/server";
import { z } from "zod";
import { plaidClient } from "@/lib/plaid";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const exchangeTokenSchema = z.object({
  public_token: z.string(),
  metadata: z.object({
    institution: z.object({
      institution_id: z.string(),
      name: z.string(),
    }),
    accounts: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        subtype: z.string().nullable(),
        mask: z.string().nullable(),
      })
    ),
  }),
});

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`plaid-exchange:${clientId}`, RATE_LIMITS.expensive);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();
    const body = await request.json();
    const { public_token, metadata } = exchangeTokenSchema.parse(body);

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Create PlaidItem and BankAccounts
    const plaidItem = await prisma.plaidItem.create({
      data: {
        userId: user.id,
        accessToken: encrypt(accessToken),
        itemId,
        institutionId: metadata.institution.institution_id,
        institutionName: metadata.institution.name,
        bankAccounts: {
          create: metadata.accounts.map((account) => ({
            plaidAccountId: account.id,
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
          })),
        },
      },
      include: {
        bankAccounts: true,
      },
    });

    return NextResponse.json({
      success: true,
      institution: metadata.institution.name,
      accounts: plaidItem.bankAccounts.length,
    });
  } catch (error) {
    console.error("Error exchanging token:", error);
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
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
