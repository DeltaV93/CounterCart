import { trackEvent } from "fathom-client";

/**
 * Hash user ID for privacy - only used for cohort analysis
 * Uses first 16 chars of SHA-256 hash.
 * Server-side only - uses dynamic import to avoid bundling Node.js crypto in client.
 */
export async function hashUserId(userId: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(userId).digest("hex").substring(0, 16);
}

/**
 * Bucket donation amounts for privacy
 */
export function bucketAmount(amount: number): string {
  if (amount < 1) return "under_1";
  if (amount < 5) return "1_to_5";
  if (amount < 10) return "5_to_10";
  if (amount < 25) return "10_to_25";
  if (amount < 50) return "25_to_50";
  return "50_plus";
}

/**
 * Analytics event names - centralized for consistency
 */
export const AnalyticsEvents = {
  // Auth events
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN: "login",
  LOGOUT: "logout",

  // Onboarding events
  ONBOARDING_CAUSES_SELECTED: "onboarding_causes_selected",
  ONBOARDING_BANK_CONNECTED: "onboarding_bank_connected",
  ONBOARDING_CHARITIES_SELECTED: "onboarding_charities_selected",
  ONBOARDING_PREFERENCES_SET: "onboarding_preferences_set",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Donation events
  DONATION_CREATED: "donation_created",
  DONATION_STARTED: "donation_started",
  DONATION_COMPLETED: "donation_completed",
  DONATION_FAILED: "donation_failed",

  // Transaction events
  TRANSACTION_MATCHED: "transaction_matched",
  TRANSACTION_SKIPPED: "transaction_skipped",

  // Settings events
  SETTINGS_UPDATED: "settings_updated",
  CHARITY_PREFERENCE_CHANGED: "charity_preference_changed",

  // Subscription events
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",
  SUBSCRIPTION_CANCELED: "subscription_canceled",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/**
 * Track an analytics event
 * Only works on client-side
 */
export function track(
  eventName: AnalyticsEventName,
  options?: {
    /** Value in cents for monetary events */
    value?: number;
  }
): void {
  if (typeof window === "undefined") {
    // Server-side - skip
    return;
  }

  if (!process.env.NEXT_PUBLIC_FATHOM_SITE_ID) {
    // Not configured - skip silently
    return;
  }

  if (options?.value !== undefined) {
    trackEvent(eventName, { _value: options.value });
  } else {
    trackEvent(eventName);
  }
}

/**
 * Track a donation event with bucketed amount
 */
export function trackDonation(
  eventName: Extract<
    AnalyticsEventName,
    "donation_created" | "donation_started" | "donation_completed" | "donation_failed"
  >,
  amount: number
): void {
  const bucket = bucketAmount(amount);
  // Track the event with the bucket as part of the name for segmentation
  track(`${eventName}_${bucket}` as AnalyticsEventName);
  // Also track the base event for totals
  track(eventName);
}
