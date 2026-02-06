import { logger } from "./logger";
import crypto from "crypto";

const CHANGE_API_URL = "https://api.getchange.io/v1";

if (!process.env.CHANGE_API_KEY) {
  logger.warn("CHANGE_API_KEY is not set - Change API integration will not work");
}

interface ChangeNonprofit {
  id: string;
  name: string;
  ein: string;
  mission?: string;
  logo_url?: string;
  website?: string;
}

interface ChangeDonation {
  id: string;
  amount: number; // in cents
  nonprofit_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  receipt_url?: string;
}

interface CreateDonationParams {
  nonprofitId: string;
  amount: number; // in cents
  metadata?: Record<string, string>;
}

interface CreateDonationResponse {
  id: string;
  amount: number;
  nonprofit_id: string;
  status: string;
  created_at: string;
}

interface ChangeError {
  error: string;
  message: string;
}

class ChangeApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ChangeError
  ) {
    super(message);
    this.name = "ChangeApiError";
  }
}

async function changeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.CHANGE_API_KEY;
  if (!apiKey) {
    throw new ChangeApiError("CHANGE_API_KEY is not configured", 500);
  }

  const url = `${CHANGE_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ChangeApiError(
      errorBody?.message || `Change API error: ${response.status}`,
      response.status,
      errorBody
    );
  }

  return response.json();
}

/**
 * Search for a nonprofit by EIN or name
 */
export async function searchNonprofit(
  query: string
): Promise<ChangeNonprofit[]> {
  const response = await changeRequest<{ nonprofits: ChangeNonprofit[] }>(
    `/nonprofits/search?q=${encodeURIComponent(query)}`
  );
  return response.nonprofits;
}

/**
 * Get a nonprofit by ID
 */
export async function getNonprofit(
  nonprofitId: string
): Promise<ChangeNonprofit> {
  return changeRequest<ChangeNonprofit>(`/nonprofits/${nonprofitId}`);
}

/**
 * Get a nonprofit by EIN
 */
export async function getNonprofitByEin(ein: string): Promise<ChangeNonprofit | null> {
  try {
    const nonprofits = await searchNonprofit(ein);
    return nonprofits.find((n) => n.ein === ein) || null;
  } catch (error) {
    logger.warn("Failed to find nonprofit by EIN", { ein }, error);
    return null;
  }
}

/**
 * Create a donation to a nonprofit
 */
export async function createDonation(
  params: CreateDonationParams
): Promise<CreateDonationResponse> {
  const response = await changeRequest<CreateDonationResponse>("/donations", {
    method: "POST",
    body: JSON.stringify({
      nonprofit_id: params.nonprofitId,
      amount: params.amount,
      metadata: params.metadata,
    }),
  });

  logger.info("Created Change donation", {
    donationId: response.id,
    nonprofitId: params.nonprofitId,
    amount: params.amount,
  });

  return response;
}

/**
 * Get a donation by ID
 */
export async function getDonation(donationId: string): Promise<ChangeDonation> {
  return changeRequest<ChangeDonation>(`/donations/${donationId}`);
}

/**
 * Verify a Change webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const webhookSecret = process.env.CHANGE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("CHANGE_WEBHOOK_SECRET is not configured");
    return false;
  }

  // Change uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export interface ChangeWebhookEvent {
  type: "donation.completed" | "donation.failed";
  data: {
    id: string;
    amount: number;
    nonprofit_id: string;
    status: string;
    metadata?: Record<string, string>;
    receipt_url?: string;
    error_message?: string;
    created_at: string;
    completed_at?: string;
  };
}

/**
 * Parse a Change webhook event
 */
export function parseWebhookEvent(payload: string): ChangeWebhookEvent {
  return JSON.parse(payload);
}

export { ChangeApiError };
