/**
 * Every.org Partner Disbursement API Client
 *
 * Used to distribute grants from Tech by Choice to designated charities.
 * Requires Partner API access from Every.org (contact partners@every.org).
 *
 * Flow:
 * 1. ACH payment succeeds (funds received by TBC)
 * 2. Call createDisbursement() with grant details
 * 3. Every.org queues grants to each nonprofit
 * 4. Webhook notifies when disbursement completes
 */

import crypto from "crypto";
import { logger } from "./logger";

const EVERYORG_PARTNER_API_URL = "https://partners.every.org/v1";

export interface GrantRequest {
  nonprofit_id: string; // Every.org nonprofit slug or EIN
  amount: number; // Amount in cents
  memo?: string; // e.g., "CounterCart grant - Climate Action"
  metadata?: {
    batch_id?: string;
    donation_ids?: string[];
    designated_cause?: string;
  };
}

export interface DisbursementResponse {
  id: string; // Disbursement batch ID
  status: "queued" | "processing";
  disbursements: Array<{
    id: string;
    nonprofit_id: string;
    amount: number;
    status: "queued";
  }>;
}

export interface DisbursementWebhookPayload {
  type: "disbursement.completed" | "disbursement.failed";
  disbursement_id: string;
  status: "completed" | "failed";
  disbursements: Array<{
    id: string;
    nonprofit_id: string;
    amount: number;
    status: "completed" | "failed";
    failure_reason?: string;
    metadata?: {
      batch_id?: string;
      donation_ids?: string[];
      designated_cause?: string;
    };
  }>;
}

interface EveryOrgPartnerConfig {
  partnerId: string;
  partnerSecret: string;
  webhookUrl: string;
}

export class EveryOrgPartnerClient {
  private config: EveryOrgPartnerConfig;

  constructor() {
    const partnerId = process.env.EVERYORG_PARTNER_ID;
    const partnerSecret = process.env.EVERYORG_PARTNER_SECRET;

    if (!partnerId || !partnerSecret) {
      logger.warn(
        "Every.org Partner API credentials not configured - grant distribution will fail"
      );
    }

    this.config = {
      partnerId: partnerId || "",
      partnerSecret: partnerSecret || "",
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/everyorg/disbursement`,
    };
  }

  /**
   * Check if the Partner API is configured
   */
  isConfigured(): boolean {
    return !!this.config.partnerId && !!this.config.partnerSecret;
  }

  /**
   * Create a disbursement batch to distribute grants to multiple nonprofits
   *
   * @param grants - Array of grant requests with nonprofit IDs and amounts
   * @returns Disbursement response with batch ID and status
   */
  async createDisbursement(grants: GrantRequest[]): Promise<DisbursementResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        "Every.org Partner API not configured. Set EVERYORG_PARTNER_ID and EVERYORG_PARTNER_SECRET."
      );
    }

    if (grants.length === 0) {
      throw new Error("No grants provided for disbursement");
    }

    const totalAmount = grants.reduce((sum, g) => sum + g.amount, 0);

    logger.info("Creating Every.org disbursement", {
      grantCount: grants.length,
      totalAmountCents: totalAmount,
      nonprofits: grants.map((g) => g.nonprofit_id),
    });

    const response = await fetch(`${EVERYORG_PARTNER_API_URL}/disbursements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.partnerSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partner_id: this.config.partnerId,
        disbursements: grants,
        webhook_url: this.config.webhookUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Every.org disbursement API error", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Every.org API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result: DisbursementResponse = await response.json();

    logger.info("Every.org disbursement created", {
      disbursementId: result.id,
      status: result.status,
      grantCount: result.disbursements.length,
    });

    return result;
  }

  /**
   * Get the status of a disbursement batch
   *
   * @param disbursementId - The disbursement batch ID
   * @returns Current status of the disbursement
   */
  async getDisbursementStatus(disbursementId: string): Promise<{
    id: string;
    status: "queued" | "processing" | "completed" | "failed";
    disbursements: Array<{
      id: string;
      nonprofit_id: string;
      amount: number;
      status: "queued" | "processing" | "completed" | "failed";
      failure_reason?: string;
    }>;
  }> {
    if (!this.isConfigured()) {
      throw new Error("Every.org Partner API not configured");
    }

    const response = await fetch(
      `${EVERYORG_PARTNER_API_URL}/disbursements/${disbursementId}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.partnerSecret}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Every.org API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Verify the signature of an Every.org webhook request
 *
 * @param payload - The raw request body
 * @param signature - The x-everyorg-signature header
 * @returns true if signature is valid
 */
export function verifyEveryOrgDisbursementSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) {
    return false;
  }

  const webhookSecret = process.env.EVERYORG_DISBURSEMENT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn("EVERYORG_DISBURSEMENT_WEBHOOK_SECRET not configured");
    // In development, allow unverified webhooks
    if (process.env.NODE_ENV === "development") {
      return true;
    }
    return false;
  }

  // Every.org uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Singleton instance
let partnerClient: EveryOrgPartnerClient | null = null;

export function getEveryOrgPartnerClient(): EveryOrgPartnerClient {
  if (!partnerClient) {
    partnerClient = new EveryOrgPartnerClient();
  }
  return partnerClient;
}
