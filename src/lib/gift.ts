import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

/**
 * Generate a cryptographically secure gift code
 * Format: XXXX-XXXX-XXXX (12 alphanumeric characters with dashes)
 */
export function createGiftCode(): string {
  // Generate random bytes and convert to base36 (alphanumeric)
  const bytes = randomBytes(9);
  const code = bytes
    .toString("base64")
    .replace(/[+/=]/g, "") // Remove non-alphanumeric base64 chars
    .substring(0, 12)
    .toUpperCase();

  // Format as XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/**
 * Generate a unique gift code that doesn't exist in the database
 */
export async function generateGiftCode(): Promise<string> {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = createGiftCode();

    // Check if code already exists
    const existing = await prisma.giftSubscription.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  throw new Error("Failed to generate unique gift code after maximum attempts");
}

/**
 * Validate gift code format
 */
export function isValidGiftCodeFormat(code: string): boolean {
  // Normalize: remove dashes and convert to uppercase
  const normalized = code.replace(/-/g, "").toUpperCase();

  // Should be exactly 12 alphanumeric characters
  return /^[A-Z0-9]{12}$/.test(normalized);
}

/**
 * Normalize gift code (remove dashes, uppercase)
 */
export function normalizeGiftCode(code: string): string {
  return code.replace(/-/g, "").toUpperCase();
}

/**
 * Format gift code with dashes for display
 */
export function formatGiftCode(code: string): string {
  const normalized = normalizeGiftCode(code);
  if (normalized.length !== 12) return code;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`;
}
