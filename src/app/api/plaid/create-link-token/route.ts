import { NextResponse } from "next/server";
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`plaid-link:${clientId}`, RATE_LIMITS.expensive);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const user = await requireUser();

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: "CounterCart",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`,
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    logger.error("Error creating link token", undefined, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    );
  }
}
