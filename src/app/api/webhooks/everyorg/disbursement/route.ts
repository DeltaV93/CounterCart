import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  verifyEveryOrgDisbursementSignature,
  DisbursementWebhookPayload,
} from "@/lib/everyorg-partner";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

/**
 * Every.org Partner Disbursement Webhook Handler
 *
 * Called when grant disbursements complete or fail.
 * Updates batch and donation records, sends confirmation emails.
 */
export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    `webhook-everyorg-disbursement:${clientId}`,
    RATE_LIMITS.webhook
  );
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-everyorg-signature");

    // Verify webhook signature
    if (!verifyEveryOrgDisbursementSignature(rawBody, signature)) {
      logger.warn("Invalid Every.org disbursement webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: DisbursementWebhookPayload = JSON.parse(rawBody);

    logger.info("Received Every.org disbursement webhook", {
      type: payload.type,
      disbursementId: payload.disbursement_id,
      status: payload.status,
      grantCount: payload.disbursements?.length || 0,
    });

    // Check for duplicate event processing
    const existingEvent = await prisma.webhookEvent.findFirst({
      where: {
        source: "every_org",
        eventId: payload.disbursement_id,
        eventType: payload.type,
      },
    });

    if (existingEvent) {
      logger.info("Duplicate disbursement webhook, skipping", {
        disbursementId: payload.disbursement_id,
      });
      return NextResponse.json({ received: true, status: "duplicate" });
    }

    // Log webhook event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: "every_org",
        eventType: payload.type,
        eventId: payload.disbursement_id,
        payload: payload as unknown as object,
        status: "PENDING",
      },
    });

    try {
      if (payload.type === "disbursement.completed") {
        await handleDisbursementCompleted(payload);
      } else if (payload.type === "disbursement.failed") {
        await handleDisbursementFailed(payload);
      }

      // Mark webhook as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
          retryCount: { increment: 1 },
        },
      });
      throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Every.org disbursement webhook", undefined, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful disbursement - grants were sent to charities
 */
async function handleDisbursementCompleted(payload: DisbursementWebhookPayload) {
  const { disbursement_id, disbursements } = payload;

  // Find the batch by disbursement ID
  const batch = await prisma.donationBatch.findFirst({
    where: { everyOrgDisbursementId: disbursement_id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          notifyDonationComplete: true,
        },
      },
      donations: {
        include: {
          designatedCause: true,
        },
      },
    },
  });

  if (!batch) {
    logger.warn("No batch found for disbursement", { disbursement_id });
    return;
  }

  const now = new Date();

  // Update batch status
  await prisma.donationBatch.update({
    where: { id: batch.id },
    data: {
      grantStatus: "completed",
      grantedAt: now,
    },
  });

  // Update individual donations based on disbursement results
  for (const grant of disbursements) {
    const donationIds = grant.metadata?.donation_ids || [];

    if (donationIds.length > 0) {
      await prisma.donation.updateMany({
        where: { id: { in: donationIds } },
        data: {
          grantStatus: "granted",
          everyOrgGrantId: grant.id,
          grantedAt: now,
        },
      });
    }
  }

  logger.info("Disbursement completed - grants distributed", {
    batchId: batch.id,
    disbursementId: disbursement_id,
    grantCount: disbursements.length,
    totalAmount: batch.totalAmount.toNumber(),
  });

  // Send confirmation email to user
  if (batch.user.notifyDonationComplete) {
    await sendGrantConfirmationEmail(batch.user, batch.donations, disbursements);
  }
}

/**
 * Handle failed disbursement - grants could not be sent
 */
async function handleDisbursementFailed(payload: DisbursementWebhookPayload) {
  const { disbursement_id, disbursements } = payload;

  // Find the batch
  const batch = await prisma.donationBatch.findFirst({
    where: { everyOrgDisbursementId: disbursement_id },
  });

  if (!batch) {
    logger.warn("No batch found for failed disbursement", { disbursement_id });
    return;
  }

  // Collect failure reasons
  const failureReasons = disbursements
    .filter((d) => d.failure_reason)
    .map((d) => `${d.nonprofit_id}: ${d.failure_reason}`)
    .join("; ");

  // Update batch status
  await prisma.donationBatch.update({
    where: { id: batch.id },
    data: {
      grantStatus: "failed",
      grantError: failureReasons || "Disbursement failed",
    },
  });

  // Update individual donations
  for (const grant of disbursements) {
    const donationIds = grant.metadata?.donation_ids || [];

    if (donationIds.length > 0 && grant.status === "failed") {
      await prisma.donation.updateMany({
        where: { id: { in: donationIds } },
        data: {
          grantStatus: "failed",
          errorMessage: grant.failure_reason || "Grant disbursement failed",
        },
      });
    }
  }

  logger.error("Disbursement failed", {
    batchId: batch.id,
    disbursementId: disbursement_id,
    failureReasons,
  });

  // TODO: Send admin alert email
}

/**
 * Send confirmation email when grants are distributed
 */
async function sendGrantConfirmationEmail(
  user: { email: string; name: string | null },
  donations: Array<{
    amount: { toNumber(): number } | number;
    designatedCause: { name: string } | null;
  }>,
  disbursements: DisbursementWebhookPayload["disbursements"]
) {
  const firstName = user.name?.split(" ")[0] || "there";
  const totalAmount = donations.reduce((sum, d) => {
    const amount = typeof d.amount === "number" ? d.amount : d.amount.toNumber();
    return sum + amount;
  }, 0);

  // Group by cause for display
  const causeAmounts: Record<string, number> = {};
  for (const donation of donations) {
    const causeName = donation.designatedCause?.name || "General";
    const amount = typeof donation.amount === "number"
      ? donation.amount
      : donation.amount.toNumber();
    causeAmounts[causeName] = (causeAmounts[causeName] || 0) + amount;
  }

  const causeList = Object.entries(causeAmounts)
    .map(([cause, amount]) => `<li>${cause}: $${amount.toFixed(2)}</li>`)
    .join("");

  const charityList = disbursements
    .map((d) => `<li>${d.nonprofit_id} - $${(d.amount / 100).toFixed(2)}</li>`)
    .join("");

  await sendEmail({
    to: user.email,
    subject: `Your $${totalAmount.toFixed(2)} in grants have been distributed!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #e11d48; margin: 0;">CounterCart</h1>
  </div>

  <p>Hi ${firstName},</p>

  <p>Great news! Your offset donations have been distributed as grants to the following charities:</p>

  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; font-weight: 600;">Grants Distributed:</p>
    <ul style="margin: 0; padding-left: 20px;">
      ${charityList}
    </ul>
    <p style="margin: 15px 0 0 0; font-weight: 600; color: #16a34a;">
      Total: $${totalAmount.toFixed(2)}
    </p>
  </div>

  <p style="color: #666; font-size: 14px;">
    These grants were designated for the following causes:
  </p>
  <ul style="color: #666; font-size: 14px;">
    ${causeList}
  </ul>

  <p>Thank you for making a difference with your purchases!</p>

  <p style="margin-top: 30px;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/donations"
       style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Your Impact
    </a>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    CounterCart is operated by Tech by Choice, a 501(c)(3) nonprofit organization.
    Your donations are tax-deductible contributions to Tech by Choice.
  </p>
</body>
</html>
    `,
  });
}
