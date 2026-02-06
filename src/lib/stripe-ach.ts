import { stripe } from "./stripe";
import prisma from "./prisma";
import { logger } from "./logger";
import Stripe from "stripe";

/**
 * Create or get Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  logger.info("Created Stripe customer", { userId, customerId: customer.id });

  return customer.id;
}

/**
 * Attach a bank account to Stripe customer using Plaid bank account token
 */
export async function attachBankAccount(
  customerId: string,
  bankAccountToken: string
): Promise<Stripe.PaymentMethod> {
  // Create a PaymentMethod from the bank account token
  const paymentMethod = await stripe.paymentMethods.create({
    type: "us_bank_account",
    us_bank_account: {
      financial_connections_account: bankAccountToken,
    },
  });

  // Attach to customer
  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  logger.info("Attached bank account to Stripe customer", {
    customerId,
    paymentMethodId: paymentMethod.id,
  });

  return paymentMethod;
}

/**
 * Create a SetupIntent for ACH mandate collection
 */
export async function createAchSetupIntent(
  customerId: string,
  bankAccountId: string
): Promise<Stripe.SetupIntent> {
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: { plaidItem: { include: { user: true } } },
  });

  if (!bankAccount) {
    throw new Error(`Bank account not found: ${bankAccountId}`);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["us_bank_account"],
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
      userId: bankAccount.plaidItem.userId,
    },
  });

  logger.info("Created ACH SetupIntent", {
    customerId,
    setupIntentId: setupIntent.id,
    bankAccountId,
  });

  return setupIntent;
}

/**
 * Confirm a SetupIntent after user authorizes ACH mandate
 */
export async function confirmAchSetupIntent(
  setupIntentId: string,
  paymentMethodId: string
): Promise<Stripe.SetupIntent> {
  const setupIntent = await stripe.setupIntents.confirm(setupIntentId, {
    payment_method: paymentMethodId,
    mandate_data: {
      customer_acceptance: {
        type: "online",
        online: {
          ip_address: "0.0.0.0", // Will be set by caller
          user_agent: "CounterCart/1.0",
        },
      },
    },
  });

  return setupIntent;
}

/**
 * Create a PaymentIntent for ACH debit (for weekly batch)
 */
export async function createAchPaymentIntent(
  customerId: string,
  paymentMethodId: string,
  amount: number, // in cents
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    customer: customerId,
    payment_method: paymentMethodId,
    payment_method_types: ["us_bank_account"],
    confirm: true,
    mandate_data: {
      customer_acceptance: {
        type: "online",
        online: {
          ip_address: "0.0.0.0",
          user_agent: "CounterCart/1.0",
        },
      },
    },
    metadata,
  });

  logger.info("Created ACH PaymentIntent", {
    customerId,
    paymentIntentId: paymentIntent.id,
    amount,
    status: paymentIntent.status,
  });

  return paymentIntent;
}

/**
 * Get ACH-enabled bank account for a user (primary for auto-donations)
 */
export async function getAchEnabledAccount(
  userId: string
): Promise<{
  bankAccountId: string;
  stripePaymentMethodId: string;
} | null> {
  const bankAccount = await prisma.bankAccount.findFirst({
    where: {
      plaidItem: { userId },
      achEnabled: true,
      stripePaymentMethodId: { not: null },
    },
  });

  if (!bankAccount || !bankAccount.stripePaymentMethodId) {
    return null;
  }

  return {
    bankAccountId: bankAccount.id,
    stripePaymentMethodId: bankAccount.stripePaymentMethodId,
  };
}

/**
 * Mark a bank account as ACH-enabled after successful setup
 */
export async function enableAchForAccount(
  bankAccountId: string,
  stripePaymentMethodId: string
): Promise<void> {
  await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      achEnabled: true,
      achAuthorizedAt: new Date(),
      stripePaymentMethodId,
    },
  });

  logger.info("Enabled ACH for bank account", {
    bankAccountId,
    stripePaymentMethodId,
  });
}

/**
 * Disable ACH for a bank account
 */
export async function disableAchForAccount(bankAccountId: string): Promise<void> {
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (bankAccount?.stripePaymentMethodId) {
    try {
      await stripe.paymentMethods.detach(bankAccount.stripePaymentMethodId);
    } catch (error) {
      logger.warn("Failed to detach Stripe payment method", {
        bankAccountId,
        paymentMethodId: bankAccount.stripePaymentMethodId,
      }, error);
    }
  }

  await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      achEnabled: false,
      achAuthorizedAt: null,
      stripePaymentMethodId: null,
    },
  });

  logger.info("Disabled ACH for bank account", { bankAccountId });
}
