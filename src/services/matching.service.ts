import prisma from "@/lib/prisma";
import { normalizeMerchantName } from "@/lib/plaid";
import { Prisma } from "@prisma/client";

type BusinessMappingWithCause = Prisma.BusinessMappingGetPayload<{
  include: { cause: true };
}>;

export interface MatchResult {
  mapping: BusinessMappingWithCause;
  confidence: number;
}

export class MatchingService {
  /**
   * Find a business mapping for a given merchant name
   */
  async findMapping(merchantName: string): Promise<MatchResult | null> {
    const normalizedName = normalizeMerchantName(merchantName);

    // Get all active mappings
    const mappings = await prisma.businessMapping.findMany({
      where: { isActive: true },
      include: { cause: true },
    });

    // Find matching mapping
    for (const mapping of mappings) {
      const pattern = mapping.merchantPattern.toUpperCase();

      // Check if the normalized merchant name contains the pattern
      if (normalizedName.includes(pattern)) {
        return {
          mapping,
          confidence: mapping.confidence.toNumber(),
        };
      }
    }

    return null;
  }

  /**
   * Calculate donation amount based on transaction and user settings
   */
  calculateDonationAmount(
    transactionAmount: number,
    multiplier: number
  ): number {
    // Round up to nearest dollar
    const roundedUp = Math.ceil(transactionAmount);
    const roundUpAmount = roundedUp - transactionAmount;

    // If the transaction is already a round number, use $1
    const baseAmount = roundUpAmount === 0 ? 1 : roundUpAmount;

    // Apply multiplier
    return Number((baseAmount * multiplier).toFixed(2));
  }

  /**
   * Check if user has selected the cause for this mapping
   */
  async userHasCause(userId: string, causeId: string): Promise<boolean> {
    const userCause = await prisma.userCause.findUnique({
      where: {
        userId_causeId: {
          userId,
          causeId,
        },
      },
    });

    return !!userCause;
  }

  /**
   * Get the default charity for a cause
   */
  async getDefaultCharity(causeId: string) {
    return prisma.charity.findFirst({
      where: {
        causeId,
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Process a transaction and create a donation if matched
   */
  async processTransaction(
    userId: string,
    transactionId: string
  ): Promise<{ matched: boolean; donationId?: string }> {
    // Get the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return { matched: false };
    }

    // Find matching business
    const match = await this.findMapping(transaction.merchantName);

    if (!match) {
      // Update transaction status to SKIPPED
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "SKIPPED" },
      });
      return { matched: false };
    }

    // Check if user cares about this cause
    const userCaresCause = await this.userHasCause(
      userId,
      match.mapping.causeId
    );

    if (!userCaresCause) {
      // Update transaction status to SKIPPED
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: "SKIPPED",
          matchedMappingId: match.mapping.id,
        },
      });
      return { matched: false };
    }

    // Get user settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { matched: false };
    }

    // Calculate donation amount
    const donationAmount = this.calculateDonationAmount(
      transaction.amount.toNumber(),
      user.donationMultiplier.toNumber()
    );

    // Check monthly limit
    if (user.monthlyLimit) {
      const newTotal = user.currentMonthTotal.toNumber() + donationAmount;
      if (newTotal > user.monthlyLimit.toNumber()) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: "SKIPPED",
            matchedMappingId: match.mapping.id,
          },
        });
        return { matched: false };
      }
    }

    // Get charity
    const charity = await this.getDefaultCharity(match.mapping.causeId);

    if (!charity) {
      console.error(`No default charity for cause: ${match.mapping.causeId}`);
      return { matched: false };
    }

    // Create donation and update transaction in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update transaction
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: "MATCHED",
          matchedMappingId: match.mapping.id,
        },
      });

      // Create donation
      const donation = await tx.donation.create({
        data: {
          userId,
          transactionId,
          charityId: charity.id,
          charitySlug: charity.everyOrgSlug,
          charityName: charity.name,
          amount: donationAmount,
          status: "PENDING",
        },
      });

      // Update user's current month total
      await tx.user.update({
        where: { id: userId },
        data: {
          currentMonthTotal: {
            increment: donationAmount,
          },
        },
      });

      return donation;
    });

    return { matched: true, donationId: result.id };
  }
}

export const matchingService = new MatchingService();
