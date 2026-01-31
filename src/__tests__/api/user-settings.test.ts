/**
 * @jest-environment node
 */

import { z } from "zod";

// Test the settings validation schema
const updateSettingsSchema = z.object({
  donationMultiplier: z.number().min(0.5).max(10).optional(),
  monthlyLimit: z.number().min(5).max(10000).optional(),
  autoDonateEnabled: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
  name: z.string().min(1).optional(),
  notifyDonationComplete: z.boolean().optional(),
  notifyWeeklySummary: z.boolean().optional(),
  notifyNewMatch: z.boolean().optional(),
  notifyPaymentFailed: z.boolean().optional(),
  notifyBankDisconnected: z.boolean().optional(),
});

describe("User Settings API", () => {
  describe("Validation Schema", () => {
    it("should accept valid settings", () => {
      const validSettings = {
        donationMultiplier: 2,
        monthlyLimit: 100,
        autoDonateEnabled: true,
        name: "Test User",
      };

      const result = updateSettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
    });

    it("should reject donation multiplier below 0.5", () => {
      const invalidSettings = {
        donationMultiplier: 0.1,
      };

      const result = updateSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it("should reject donation multiplier above 10", () => {
      const invalidSettings = {
        donationMultiplier: 15,
      };

      const result = updateSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it("should reject monthly limit below 5", () => {
      const invalidSettings = {
        monthlyLimit: 2,
      };

      const result = updateSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it("should reject monthly limit above 10000", () => {
      const invalidSettings = {
        monthlyLimit: 20000,
      };

      const result = updateSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalidSettings = {
        name: "",
      };

      const result = updateSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it("should accept notification preferences", () => {
      const settings = {
        notifyDonationComplete: true,
        notifyWeeklySummary: false,
        notifyNewMatch: true,
        notifyPaymentFailed: true,
        notifyBankDisconnected: false,
      };

      const result = updateSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it("should accept empty object (no updates)", () => {
      const result = updateSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
