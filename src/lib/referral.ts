import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

/**
 * Generate a unique 6-character alphanumeric referral code
 */
export function generateReferralCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate a unique referral code, checking for collisions
 */
export async function createUniqueReferralCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
    attempts++;
  }

  // Fallback to longer code if we hit collision limit
  return generateReferralCode() + randomBytes(2).toString("hex");
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referralCount: true,
    },
  });

  return {
    code: user?.referralCode,
    referralCount: user?.referralCount || 0,
  };
}

/**
 * Track a successful referral signup
 */
export async function trackReferral(
  newUserId: string,
  referralCode: string
): Promise<boolean> {
  // Find the referrer by code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: referralCode },
    select: { id: true },
  });

  if (!referrer) {
    return false;
  }

  // Update both users in a transaction
  await prisma.$transaction([
    // Mark new user as referred
    prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referralCode },
    }),
    // Increment referrer's count
    prisma.user.update({
      where: { id: referrer.id },
      data: { referralCount: { increment: 1 } },
    }),
  ]);

  return true;
}
