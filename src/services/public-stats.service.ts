import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Types for public stats
export interface PublicStats {
  totalDonated: number;
  totalUsers: number;
  topCompaniesOffset: CompanyOffset[];
  topCauses: CauseFunding[];
}

export interface CompanyOffset {
  merchantName: string;
  totalOffset: number;
  donationCount: number;
}

export interface CauseFunding {
  causeId: string;
  causeName: string;
  causeSlug: string;
  totalFunded: number;
  donationCount: number;
}

// Cache for public stats
interface StatsCache {
  stats: PublicStats;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let statsCache: StatsCache | null = null;

export class PublicStatsService {
  /**
   * Get cached public stats or fetch from database
   */
  async getStats(): Promise<PublicStats> {
    const now = Date.now();

    // Return cached stats if valid
    if (statsCache && statsCache.expiresAt > now) {
      logger.debug("Returning cached public stats");
      return statsCache.stats;
    }

    logger.info("Fetching fresh public stats from database");

    const [totalDonated, totalUsers, topCompaniesOffset, topCauses] =
      await Promise.all([
        this.getTotalDonated(),
        this.getTotalUsers(),
        this.getTopCompaniesOffset(),
        this.getTopCauses(),
      ]);

    const stats: PublicStats = {
      totalDonated,
      totalUsers,
      topCompaniesOffset,
      topCauses,
    };

    // Update cache
    statsCache = {
      stats,
      expiresAt: now + CACHE_TTL_MS,
    };

    return stats;
  }

  /**
   * Invalidate the stats cache (call after significant donation events)
   */
  invalidateCache(): void {
    statsCache = null;
    logger.info("Public stats cache invalidated");
  }

  /**
   * Get total amount donated across all users (completed donations only)
   */
  private async getTotalDonated(): Promise<number> {
    const result = await prisma.donation.aggregate({
      where: {
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Get total number of active users (with at least one completed donation)
   */
  private async getTotalUsers(): Promise<number> {
    const result = await prisma.user.count({
      where: {
        donations: {
          some: {
            status: "COMPLETED",
          },
        },
      },
    });

    return result;
  }

  /**
   * Get top companies by total offset amount
   * Groups by merchant name from matched transactions
   */
  private async getTopCompaniesOffset(limit = 10): Promise<CompanyOffset[]> {
    // Get all completed donations with their matched transactions
    const donations = await prisma.donation.findMany({
      where: {
        status: "COMPLETED",
        transactionId: { not: null },
      },
      include: {
        transaction: {
          include: {
            matchedMapping: true,
          },
        },
      },
    });

    // Aggregate by merchant name
    const companyMap = new Map<
      string,
      { totalOffset: number; donationCount: number }
    >();

    for (const donation of donations) {
      const merchantName =
        donation.transaction?.matchedMapping?.merchantName || "Unknown";

      const existing = companyMap.get(merchantName) || {
        totalOffset: 0,
        donationCount: 0,
      };

      companyMap.set(merchantName, {
        totalOffset: existing.totalOffset + donation.amount.toNumber(),
        donationCount: existing.donationCount + 1,
      });
    }

    // Convert to array and sort by total offset
    const companies: CompanyOffset[] = Array.from(companyMap.entries())
      .map(([merchantName, data]) => ({
        merchantName,
        totalOffset: data.totalOffset,
        donationCount: data.donationCount,
      }))
      .sort((a, b) => b.totalOffset - a.totalOffset)
      .slice(0, limit);

    return companies;
  }

  /**
   * Get top causes by total funding
   */
  private async getTopCauses(limit = 10): Promise<CauseFunding[]> {
    // Get all completed donations grouped by charity's cause
    const donations = await prisma.donation.findMany({
      where: {
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

    // Aggregate by cause
    const causeMap = new Map<
      string,
      {
        causeName: string;
        causeSlug: string;
        totalFunded: number;
        donationCount: number;
      }
    >();

    for (const donation of donations) {
      const cause = donation.charity?.cause;
      if (!cause) continue;

      const existing = causeMap.get(cause.id) || {
        causeName: cause.name,
        causeSlug: cause.slug,
        totalFunded: 0,
        donationCount: 0,
      };

      causeMap.set(cause.id, {
        causeName: cause.name,
        causeSlug: cause.slug,
        totalFunded: existing.totalFunded + donation.amount.toNumber(),
        donationCount: existing.donationCount + 1,
      });
    }

    // Convert to array and sort by total funded
    const causes: CauseFunding[] = Array.from(causeMap.entries())
      .map(([causeId, data]) => ({
        causeId,
        causeName: data.causeName,
        causeSlug: data.causeSlug,
        totalFunded: data.totalFunded,
        donationCount: data.donationCount,
      }))
      .sort((a, b) => b.totalFunded - a.totalFunded)
      .slice(0, limit);

    return causes;
  }
}

export const publicStatsService = new PublicStatsService();
