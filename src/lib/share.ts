/**
 * Share utilities for generating social share URLs and text
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

export type SharePlatform = "twitter" | "facebook" | "linkedin" | "copy";

interface ShareData {
  businesses: Array<{ name: string; amount: number }>;
  charities: Array<{ name: string }>;
  totalSpent: number;
  totalDonated: number;
  referralCode: string;
}

/**
 * Generate share text for the offset receipt
 */
export function generateShareText(data: ShareData): string {
  const businessList = data.businesses
    .slice(0, 3)
    .map((b) => b.name)
    .join(", ");
  const charityList = data.charities
    .slice(0, 2)
    .map((c) => c.name)
    .join(" & ");

  const text = `This week I spent $${data.totalSpent.toFixed(2)} at ${businessList}, but offset with $${data.totalDonated.toFixed(2)} to ${charityList}. Join me:`;

  return text;
}

/**
 * Generate the referral URL
 */
export function getReferralUrl(referralCode: string): string {
  return `${APP_URL}/r/${referralCode}`;
}

/**
 * Generate Twitter share URL
 */
export function getTwitterShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({
    text,
    url,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generate Facebook share URL
 */
export function getFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({
    u: url,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Generate LinkedIn share URL
 */
export function getLinkedInShareUrl(url: string, text: string): string {
  const params = new URLSearchParams({
    url,
    text,
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Get all share URLs for a given receipt
 */
export function getShareUrls(data: ShareData): Record<SharePlatform, string> {
  const text = generateShareText(data);
  const url = getReferralUrl(data.referralCode);

  return {
    twitter: getTwitterShareUrl(text, url),
    facebook: getFacebookShareUrl(url),
    linkedin: getLinkedInShareUrl(url, text),
    copy: url,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}
