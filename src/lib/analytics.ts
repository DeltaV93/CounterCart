import { trackEvent } from "fathom-client";
import { createHash } from "crypto";

/**
 * Hash user ID for privacy - only used for cohort analysis
 * Uses first 16 chars of SHA-256 hash
 */
export function hashUserId(userId: string): string {
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

  // === GROWTH FEATURES ===

  // Offset Receipt / Sharing
  RECEIPT_GENERATED: "receipt_generated",
  RECEIPT_SHARED_TWITTER: "receipt_shared_twitter",
  RECEIPT_SHARED_FACEBOOK: "receipt_shared_facebook",
  RECEIPT_SHARED_LINKEDIN: "receipt_shared_linkedin",
  RECEIPT_SHARED_COPY: "receipt_shared_copy",
  REFERRAL_LINK_CLICKED: "referral_link_clicked",
  REFERRAL_SIGNUP: "referral_signup",

  // Cause Clubs
  CLUB_VIEWED: "club_viewed",
  CLUB_JOINED: "club_joined",
  CLUB_INVITE_SENT: "club_invite_sent",
  CLUB_INVITE_CLICKED: "club_invite_clicked",
  CLUB_INVITE_CONVERTED: "club_invite_converted",

  // Challenges
  CHALLENGE_VIEWED: "challenge_viewed",
  CHALLENGE_JOINED: "challenge_joined",
  CHALLENGE_SHARED: "challenge_shared",
  CHALLENGE_COMPLETED: "challenge_completed",

  // Organizations / B2B
  ORG_CREATED: "org_created",
  ORG_MEMBER_JOINED: "org_member_joined",
  ORG_INVITE_SENT: "org_invite_sent",
  ORG_REPORT_EXPORTED: "org_report_exported",

  // Leaderboards
  LEADERBOARD_VIEWED: "leaderboard_viewed",
  EMBED_WIDGET_LOADED: "embed_widget_loaded",
  EMBED_WIDGET_CLICKED: "embed_widget_clicked",

  // Gifts
  GIFT_PAGE_VIEWED: "gift_page_viewed",
  GIFT_PURCHASED: "gift_purchased",
  GIFT_SENT: "gift_sent",
  GIFT_REDEEMED: "gift_redeemed",

  // Badges/Profile
  BADGE_ENABLED: "badge_enabled",
  BADGE_DISABLED: "badge_disabled",
  BADGE_VIEWED: "badge_viewed",
  PROFILE_VIEWED: "profile_viewed",
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

/**
 * Track a share event with platform
 */
export function trackShare(
  platform: "twitter" | "facebook" | "linkedin" | "copy"
): void {
  const eventMap = {
    twitter: AnalyticsEvents.RECEIPT_SHARED_TWITTER,
    facebook: AnalyticsEvents.RECEIPT_SHARED_FACEBOOK,
    linkedin: AnalyticsEvents.RECEIPT_SHARED_LINKEDIN,
    copy: AnalyticsEvents.RECEIPT_SHARED_COPY,
  };
  track(eventMap[platform]);
}
