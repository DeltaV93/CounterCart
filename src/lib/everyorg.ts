// Every.org API Client
// Documentation: https://docs.every.org/docs/endpoints/nonprofit-search

import { logger } from "./logger";

const EVERYORG_BASE_URL = "https://partners.every.org/v0.2";

export interface EveryOrgNonprofit {
  id: string;
  name: string;
  primarySlug: string;
  ein: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  websiteUrl: string | null;
  profileUrl: string;
  locationAddress: string | null;
}

interface EveryOrgNonprofitResponse {
  nonprofit: {
    id: string;
    name: string;
    primarySlug: string;
    ein: string;
    isDisbursable: boolean;
    description: string | null;
    descriptionLong: string | null;
    locationAddress: string | null;
    nteeCode: string | null;
    nteeMeaning: string | null;
    logoCloudinaryId: string | null;
    coverImageCloudinaryId: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    websiteUrl: string | null;
    profileUrl: string;
  };
}

interface EveryOrgSearchResponse {
  nonprofits: Array<{
    name: string;
    profileUrl: string;
    ein: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    description: string | null;
    matchedTerms: string[];
  }>;
}

// Simple in-memory cache for nonprofit data (refreshes on server restart)
const nonprofitCache = new Map<string, { data: EveryOrgNonprofit; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getApiKey(): string {
  const apiKey = process.env.EVERYORG_API_KEY || process.env.NEXT_PUBLIC_EVERYORG_API_KEY;
  if (!apiKey) {
    logger.warn("Every.org API key not configured - using public endpoints without auth");
    return "";
  }
  return apiKey;
}

/**
 * Fetch nonprofit details by slug or EIN
 * Rate limit: 100 requests/minute
 */
export async function getNonprofitDetails(identifier: string): Promise<EveryOrgNonprofit | null> {
  // Check cache first
  const cached = nonprofitCache.get(identifier);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const apiKey = getApiKey();
    const url = new URL(`${EVERYORG_BASE_URL}/nonprofit/${encodeURIComponent(identifier)}`);
    if (apiKey) {
      url.searchParams.set("apiKey", apiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn("Nonprofit not found", { identifier });
        return null;
      }
      throw new Error(`Every.org API error: ${response.status} ${response.statusText}`);
    }

    const data: EveryOrgNonprofitResponse = await response.json();

    const nonprofit: EveryOrgNonprofit = {
      id: data.nonprofit.id,
      name: data.nonprofit.name,
      primarySlug: data.nonprofit.primarySlug,
      ein: data.nonprofit.ein,
      description: data.nonprofit.description || data.nonprofit.descriptionLong,
      logoUrl: data.nonprofit.logoUrl,
      coverImageUrl: data.nonprofit.coverImageUrl,
      websiteUrl: data.nonprofit.websiteUrl,
      profileUrl: data.nonprofit.profileUrl,
      locationAddress: data.nonprofit.locationAddress,
    };

    // Update cache
    nonprofitCache.set(identifier, { data: nonprofit, timestamp: Date.now() });

    return nonprofit;
  } catch (error) {
    logger.error("Error fetching nonprofit", { identifier }, error);
    return null;
  }
}

/**
 * Fetch multiple nonprofits by their slugs
 * Batches requests and returns results in parallel
 */
export async function getNonprofitsBySlug(slugs: string[]): Promise<Map<string, EveryOrgNonprofit>> {
  const results = new Map<string, EveryOrgNonprofit>();

  // Fetch all in parallel with a reasonable concurrency limit
  const batchSize = 10;
  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    const promises = batch.map(async (slug) => {
      const nonprofit = await getNonprofitDetails(slug);
      if (nonprofit) {
        results.set(slug, nonprofit);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Search nonprofits by name
 * Rate limit: 500 requests/minute
 */
export async function searchNonprofits(
  searchTerm: string,
  options?: { take?: number; causes?: string[] }
): Promise<EveryOrgNonprofit[]> {
  try {
    const apiKey = getApiKey();
    const url = new URL(`${EVERYORG_BASE_URL}/search/${encodeURIComponent(searchTerm)}`);

    if (apiKey) {
      url.searchParams.set("apiKey", apiKey);
    }
    if (options?.take) {
      url.searchParams.set("take", String(Math.min(options.take, 50)));
    }
    if (options?.causes?.length) {
      url.searchParams.set("causes", options.causes.join(","));
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Every.org API error: ${response.status} ${response.statusText}`);
    }

    const data: EveryOrgSearchResponse = await response.json();

    return data.nonprofits.map((np) => ({
      id: "", // Search doesn't return ID
      name: np.name,
      primarySlug: np.profileUrl.replace("https://www.every.org/", ""),
      ein: np.ein,
      description: np.description,
      logoUrl: np.logoUrl,
      coverImageUrl: null,
      websiteUrl: np.websiteUrl,
      profileUrl: np.profileUrl,
      locationAddress: null,
    }));
  } catch (error) {
    logger.error("Error searching nonprofits", { searchTerm }, error);
    return [];
  }
}

export interface DonationUrlOptions {
  amount?: number;
  frequency?: "ONCE" | "MONTHLY";
  successUrl?: string;
  /** Metadata to pass through webhook (donationId, userId, batchId, etc.) */
  metadata?: {
    donationId?: string;
    userId?: string;
    batchId?: string;
    /** Designated cause for fiscal sponsor transparency */
    designatedCause?: string;
    /** Donation memo/note */
    memo?: string;
  };
}

/**
 * Generate the donation URL for a nonprofit
 * Opens Every.org's donation modal with pre-filled amount
 *
 * Note: Requires webhook_token from Every.org for webhook callback.
 * Contact support@every.org to set up partner webhook.
 */
export function getDonationUrl(
  charitySlug: string,
  options?: DonationUrlOptions
): string {
  const params = new URLSearchParams();

  if (options?.amount) {
    params.set("amount", options.amount.toFixed(2));
  }
  if (options?.frequency) {
    params.set("frequency", options.frequency);
  }
  if (options?.successUrl) {
    params.set("success_url", options.successUrl);
  }

  // Add webhook token if configured
  const webhookToken = process.env.EVERYORG_WEBHOOK_TOKEN;
  if (webhookToken) {
    params.set("webhook_token", webhookToken);
  }

  // Add partner metadata for webhook tracking
  if (options?.metadata) {
    const metadataBase64 = Buffer.from(JSON.stringify(options.metadata)).toString("base64");
    params.set("partner_metadata", metadataBase64);
  }

  const queryString = params.toString();
  return `https://www.every.org/${charitySlug}#donate${queryString ? `?${queryString}` : ""}`;
}

/**
 * Clear the nonprofit cache (useful for testing)
 */
export function clearNonprofitCache(): void {
  nonprofitCache.clear();
}
