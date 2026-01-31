/**
 * @jest-environment node
 */

import crypto from "crypto";

// Mock encryption functions for testing (actual implementation uses env var)
const testSecret = crypto.randomBytes(32).toString("base64");

function encrypt(text: string, secret: string): string {
  const key = Buffer.from(secret, "base64");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedText: string, secret: string): string {
  const key = Buffer.from(secret, "base64");
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

describe("Encryption", () => {
  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a simple string", () => {
      const originalText = "my-secret-plaid-token";

      const encrypted = encrypt(originalText, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(originalText);
      expect(encrypted).not.toBe(originalText);
    });

    it("should produce different ciphertext for same input (due to random IV)", () => {
      const originalText = "test-token";

      const encrypted1 = encrypt(originalText, testSecret);
      const encrypted2 = encrypt(originalText, testSecret);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(decrypt(encrypted1, testSecret)).toBe(originalText);
      expect(decrypt(encrypted2, testSecret)).toBe(originalText);
    });

    it("should handle special characters", () => {
      const originalText = "token-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?";

      const encrypted = encrypt(originalText, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(originalText);
    });

    it("should handle long strings", () => {
      const originalText = "a".repeat(10000);

      const encrypted = encrypt(originalText, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(originalText);
    });

    it("should fail with wrong key", () => {
      const originalText = "secret-data";
      const wrongSecret = crypto.randomBytes(32).toString("base64");

      const encrypted = encrypt(originalText, testSecret);

      expect(() => {
        decrypt(encrypted, wrongSecret);
      }).toThrow();
    });

    it("should fail with tampered ciphertext", () => {
      const originalText = "secret-data";

      const encrypted = encrypt(originalText, testSecret);
      const [iv, authTag, ciphertext] = encrypted.split(":");
      const tamperedCiphertext = ciphertext.slice(0, -2) + "00";
      const tampered = `${iv}:${authTag}:${tamperedCiphertext}`;

      expect(() => {
        decrypt(tampered, testSecret);
      }).toThrow();
    });
  });
});
