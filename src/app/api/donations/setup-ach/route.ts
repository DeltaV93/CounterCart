import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { plaidService } from "@/services/plaid.service";
import {
  getOrCreateStripeCustomer,
  enableAchForAccount,
  disableAchForAccount,
  getAchEnabledAccount,
} from "@/lib/stripe-ach";
import { stripe } from "@/lib/stripe";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

/**
 * GET /api/donations/setup-ach
 * Get ACH setup status for the current user
 */
export async function GET() {
  try {
    const user = await requireUser();

    const achAccount = await getAchEnabledAccount(user.id);

    if (!achAccount) {
      return NextResponse.json({
        enabled: false,
        bankAccount: null,
      });
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: achAccount.bankAccountId },
      include: { plaidItem: true },
    });

    return NextResponse.json({
      enabled: true,
      bankAccount: bankAccount
        ? {
            id: bankAccount.id,
            name: bankAccount.name,
            mask: bankAccount.mask,
            institutionName: bankAccount.plaidItem.institutionName,
            achAuthorizedAt: bankAccount.achAuthorizedAt?.toISOString(),
          }
        : null,
    });
  } catch (error) {
    logger.error("Error fetching ACH status", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch ACH status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/donations/setup-ach
 * Start ACH setup flow - creates Stripe customer and SetupIntent
 */
export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`setup-ach:${clientId}`, RATE_LIMITS.standard);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();
    const body = await request.json();
    const { bankAccountId } = body;

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "Bank account ID is required" },
        { status: 400 }
      );
    }

    // Verify the bank account belongs to this user
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        plaidItem: { userId: user.id },
      },
      include: { plaidItem: true },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    // Only allow checking/savings accounts for ACH
    if (bankAccount.type !== "depository") {
      return NextResponse.json(
        { error: "Only checking and savings accounts can be used for ACH" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id);

    // Create Stripe bank account token via Plaid
    const bankAccountToken = await plaidService.createStripeBankAccountToken(
      bankAccount.plaidItemId,
      bankAccount.plaidAccountId
    );

    // Create a SetupIntent with the Plaid bank account
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["us_bank_account"],
      payment_method_data: {
        type: "us_bank_account",
        billing_details: {
          name: user.name || user.email,
          email: user.email,
        },
      },
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method"],
          },
          verification_method: "instant",
        },
      },
      metadata: {
        bankAccountId,
        userId: user.id,
        plaidBankToken: bankAccountToken,
      },
    });

    logger.info("Created ACH SetupIntent", {
      userId: user.id,
      bankAccountId,
      setupIntentId: setupIntent.id,
    });

    return NextResponse.json({
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (error) {
    logger.error("Error setting up ACH", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to set up ACH" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/donations/setup-ach
 * Complete ACH setup after user confirms mandate
 */
export async function PUT(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`setup-ach:${clientId}`, RATE_LIMITS.standard);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();
    const body = await request.json();
    const { setupIntentId, paymentMethodId, bankAccountId } = body;

    if (!setupIntentId || !paymentMethodId || !bankAccountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the bank account belongs to this user
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        plaidItem: { userId: user.id },
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    // Verify the SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "SetupIntent not completed" },
        { status: 400 }
      );
    }

    if (setupIntent.metadata?.userId !== user.id) {
      return NextResponse.json(
        { error: "SetupIntent does not belong to this user" },
        { status: 403 }
      );
    }

    // Enable ACH for this bank account
    await enableAchForAccount(bankAccountId, paymentMethodId);

    // Enable auto-donate for the user if not already enabled
    await prisma.user.update({
      where: { id: user.id },
      data: { autoDonateEnabled: true },
    });

    logger.info("ACH setup completed", {
      userId: user.id,
      bankAccountId,
      paymentMethodId,
    });

    return NextResponse.json({
      success: true,
      message: "ACH setup completed successfully",
    });
  } catch (error) {
    logger.error("Error completing ACH setup", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to complete ACH setup" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/donations/setup-ach
 * Disable ACH for the user
 */
export async function DELETE() {
  try {
    const user = await requireUser();

    const achAccount = await getAchEnabledAccount(user.id);

    if (!achAccount) {
      return NextResponse.json(
        { error: "No ACH account configured" },
        { status: 404 }
      );
    }

    await disableAchForAccount(achAccount.bankAccountId);

    logger.info("ACH disabled", {
      userId: user.id,
      bankAccountId: achAccount.bankAccountId,
    });

    return NextResponse.json({
      success: true,
      message: "ACH disabled successfully",
    });
  } catch (error) {
    logger.error("Error disabling ACH", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to disable ACH" },
      { status: 500 }
    );
  }
}
