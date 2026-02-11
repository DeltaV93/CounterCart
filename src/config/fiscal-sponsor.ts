/**
 * Fiscal Sponsor Configuration
 *
 * CounterCart is built under Tech by Choice (501c3).
 * Donation flow:
 * 1. Users donate directly to Tech by Choice via Stripe
 * 2. TBC receives the funds
 * 3. TBC grants funds to charities based on user designations
 *
 * Benefits:
 * - No third-party donation APIs needed (Every.org, Change.io)
 * - Direct Stripe integration - lower fees
 * - Full control over fund distribution
 * - Single tax receipt from TBC to donors
 */

export interface FiscalSponsor {
  name: string;
  ein: string;
  websiteUrl: string;
  description: string;
}

/**
 * Tech by Choice - the 501(c)(3) that operates CounterCart
 *
 * Configure via environment variables:
 * - FISCAL_SPONSOR_EIN: Tech by Choice EIN (e.g., "XX-XXXXXXX")
 */
export const FISCAL_SPONSOR: FiscalSponsor = {
  name: process.env.FISCAL_SPONSOR_NAME || "Tech by Choice",
  ein: process.env.FISCAL_SPONSOR_EIN || "",
  websiteUrl: "https://techbychoice.org",
  description:
    "Tech by Choice increases diversity in STEAM industries. CounterCart donations are tax-deductible contributions to Tech by Choice, which distributes grants to charities based on your preferences.",
};

/**
 * Check if fiscal sponsor is properly configured
 */
export function isFiscalSponsorConfigured(): boolean {
  // Just need the EIN for direct Stripe donations
  return !!FISCAL_SPONSOR.ein;
}

/**
 * Get the donation method - direct Stripe to TBC
 */
export function getDonationMethod(): "stripe" {
  return "stripe";
}

/**
 * Donation designation memo
 * This is included in donation metadata for transparency
 */
export function getDonationMemo(causeName: string): string {
  return `CounterCart offset donation - designated for ${causeName} causes`;
}

/**
 * Tax receipt disclaimer
 */
export function getTaxReceiptDisclaimer(): string {
  return `Your donation is a tax-deductible contribution to ${FISCAL_SPONSOR.name}, a 501(c)(3) nonprofit organization (EIN: ${FISCAL_SPONSOR.ein}). ${FISCAL_SPONSOR.name} will distribute grants to charities based on your designated causes.`;
}
