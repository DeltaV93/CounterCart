import { createHash, timingSafeEqual } from "crypto";
import {
  decodeProtectedHeader,
  jwtVerify,
  importJWK,
  errors,
  type JWK,
} from "jose";
import { plaidClient } from "./plaid";

type VerificationKey = Awaited<ReturnType<typeof importJWK>>;

// Cache for JWKs to avoid repeated API calls
const jwkCache = new Map<string, { key: VerificationKey; expiresAt: number }>();
const JWK_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify a Plaid webhook signature
 *
 * @param body - The raw request body as a string
 * @param plaidVerificationHeader - The Plaid-Verification header value (JWT)
 * @returns Verification result with valid flag and optional error message
 */
export async function verifyPlaidWebhook(
  body: string,
  plaidVerificationHeader: string | null
): Promise<WebhookVerificationResult> {
  if (!plaidVerificationHeader) {
    return { valid: false, error: "Missing Plaid-Verification header" };
  }

  try {
    // 1. Decode JWT header to get key ID (without verification)
    const protectedHeader = decodeProtectedHeader(plaidVerificationHeader);

    // 2. Verify algorithm is ES256
    if (protectedHeader.alg !== "ES256") {
      return { valid: false, error: `Invalid algorithm: ${protectedHeader.alg}` };
    }

    const keyId = protectedHeader.kid;
    if (!keyId) {
      return { valid: false, error: "Missing key ID in JWT header" };
    }

    // 3. Get the verification key (with caching)
    const keyLike = await getVerificationKey(keyId);

    // 4. Verify JWT signature and check token age (max 5 minutes)
    const { payload } = await jwtVerify(plaidVerificationHeader, keyLike, {
      maxTokenAge: "5 min",
      algorithms: ["ES256"],
    });

    // 5. Verify request body hash
    const expectedHash = payload.request_body_sha256 as string;
    if (!expectedHash) {
      return { valid: false, error: "Missing request_body_sha256 in JWT payload" };
    }

    const actualHash = createHash("sha256").update(body).digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const actualBuffer = Buffer.from(actualHash, "hex");

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, error: "Body hash length mismatch" };
    }

    if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
      return { valid: false, error: "Body hash mismatch" };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      return { valid: false, error: "Webhook JWT expired (older than 5 minutes)" };
    }
    if (error instanceof errors.JWSSignatureVerificationFailed) {
      return { valid: false, error: "Invalid JWT signature" };
    }
    console.error("Webhook verification error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown verification error"
    };
  }
}

/**
 * Get verification key from Plaid API with caching
 */
async function getVerificationKey(keyId: string): Promise<VerificationKey> {
  // Check cache first
  const cached = jwkCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  // Fetch from Plaid API
  const response = await plaidClient.webhookVerificationKeyGet({
    key_id: keyId,
  });

  const jwk = response.data.key;
  const keyLike = await importJWK(jwk as JWK, "ES256");

  // Cache the key
  jwkCache.set(keyId, {
    key: keyLike,
    expiresAt: Date.now() + JWK_CACHE_TTL_MS,
  });

  return keyLike;
}

/**
 * Clear the JWK cache (useful for testing)
 */
export function clearJwkCache(): void {
  jwkCache.clear();
}
