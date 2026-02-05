import prisma from "@/lib/prisma";
import { normalizeMerchantName } from "@/lib/plaid";
import { logger } from "@/lib/logger";
import { Prisma, User } from "@prisma/client";

type BusinessMappingWithCause = Prisma.BusinessMappingGetPayload<{
  include: { cause: true };
}>;

export interface MatchResult {
  mapping: BusinessMappingWithCause;
  confidence: number;
}

// Cache for business mappings
interface MappingsCache {
  mappings: BusinessMappingWithCause[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let mappingsCache: MappingsCache | null = null;

export class MatchingService {
  /**
   * Get cached business mappings or fetch from database
   */
  private async getMappings(): Promise<BusinessMappingWithCause[]> {
    const now = Date.now();

    // Return cached mappings if valid
    if (mappingsCache && mappingsCache.expiresAt > now) {
      return mappingsCache.mappings;
    }

    // Fetch from database
    const mappings = await prisma.businessMapping.findMany({
      where: { isActive: true },
      include: { cause: true },
    });

    // Update cache
    mappingsCache = {
      mappings,
      expiresAt: now + CACHE_TTL_MS,
    };

    return mappings;
  }

  /**
   * Invalidate the mappings cache (call after updating mappings)
   */
  invalidateCache(): void {
    mappingsCache = null;
  }

  /**
   * Find a business mapping for a given merchant name
   */
  async findMapping(merchantName: string): Promise<MatchResult | null> {
    const normalizedName = normalizeMerchantName(merchantName);

    // Get cached mappings
    const mappings = await this.getMappings();

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
   * Check if the monthly total needs to be reset (new month) and return current total.
   * Uses check-at-read-time pattern to avoid needing a cron job.
   */
  async getOrResetMonthlyTotal(user: User): Promise<number> {
    const now = new Date();
    const resetAt = user.monthlyResetAt;

    // Check if we're in a different month than the last reset
    const sameMonth =
      resetAt.getUTCFullYear() === now.getUTCFullYear() &&
      resetAt.getUTCMonth() === now.getUTCMonth();

    if (sameMonth) {
      return user.currentMonthTotal.toNumber();
    }

    // New month - reset the counter
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentMonthTotal: 0,
        monthlyResetAt: now,
      },
    });

    logger.info("Monthly donation total reset", { userId: user.id });
    return 0;
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

    // Reset monthly total if we're in a new month
    const currentMonthTotal = await this.getOrResetMonthlyTotal(user);

    // Calculate donation amount
    const donationAmount = this.calculateDonationAmount(
      transaction.amount.toNumber(),
      user.donationMultiplier.toNumber()
    );

    // Check monthly limit
    if (user.monthlyLimit) {
      const newTotal = currentMonthTotal + donationAmount;
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
      logger.error("No default charity for cause", { causeId: match.mapping.causeId });
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
