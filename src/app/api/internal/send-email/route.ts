import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sendWelcomeEmail,
  sendDonationConfirmation,
  sendPaymentFailedEmail,
  sendBankReconnectEmail,
} from "@/lib/email";
import { logger } from "@/lib/logger";

const emailRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("welcome"),
    email: z.string().email(),
    name: z.string().optional(),
  }),
  z.object({
    type: z.literal("donation_confirmation"),
    email: z.string().email(),
    name: z.string().optional(),
    charityName: z.string(),
    amount: z.number().positive(),
  }),
  z.object({
    type: z.literal("payment_failed"),
    email: z.string().email(),
    name: z.string().optional(),
  }),
  z.object({
    type: z.literal("bank_reconnect"),
    email: z.string().email(),
    name: z.string().optional(),
    institutionName: z.string(),
  }),
]);

export async function POST(request: Request) {
  // Validate internal API token
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!process.env.INTERNAL_API_TOKEN || token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = emailRequestSchema.parse(body);

    let success = false;

    switch (data.type) {
      case "welcome":
        success = await sendWelcomeEmail(data.email, data.name);
        break;
      case "donation_confirmation":
        success = await sendDonationConfirmation(
          data.email,
          data.name,
          data.charityName,
          data.amount
        );
        break;
      case "payment_failed":
        success = await sendPaymentFailedEmail(data.email, data.name);
        break;
      case "bank_reconnect":
        success = await sendBankReconnectEmail(data.email, data.name, data.institutionName);
        break;
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in internal send-email API", undefined, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
