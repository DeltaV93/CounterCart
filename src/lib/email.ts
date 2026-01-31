import { Resend } from "resend";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "CounterCart <noreply@countercart.app>";

type NotificationPreference =
  | "notifyDonationComplete"
  | "notifyWeeklySummary"
  | "notifyNewMatch"
  | "notifyPaymentFailed"
  | "notifyBankDisconnected";

/**
 * Check if user has enabled a specific notification type
 */
async function shouldSendNotification(
  userId: string,
  preference: NotificationPreference
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { [preference]: true },
    });

    if (!user) return true; // Default to sending if user not found

    return user[preference] ?? true; // Default to true if preference not set
  } catch (error) {
    logger.error("Error checking notification preference", { userId, preference }, error);
    return true; // Default to sending on error
  }
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  if (!resend) {
    logger.warn("Email not sent - RESEND_API_KEY not configured", { to, subject });
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error("Failed to send email", { to, subject, error: error.message });
      return false;
    }

    logger.info("Email sent successfully", { to, subject });
    return true;
  } catch (error) {
    logger.error("Error sending email", { to, subject }, error);
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendWelcomeEmail(email: string, name?: string, _userId?: string): Promise<boolean> {
  // Welcome emails are always sent (no preference check)
  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: email,
    subject: "Welcome to CounterCart!",
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

  <h2 style="color: #1f2937;">Hey ${firstName}!</h2>

  <p>Welcome to CounterCart! We're excited to have you join our community of people who want to make a positive impact with every purchase.</p>

  <p>Here's how CounterCart works:</p>

  <ol style="padding-left: 20px;">
    <li><strong>We track your purchases</strong> at businesses that may not align with your values</li>
    <li><strong>We calculate a round-up donation</strong> based on your preferences</li>
    <li><strong>You donate to charities</strong> that support the causes you care about</li>
  </ol>

  <p>To get started, make sure you've:</p>
  <ul style="padding-left: 20px;">
    <li>Selected the causes you care about</li>
    <li>Connected your bank account</li>
    <li>Set your donation preferences</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
  </div>

  <p style="color: #6b7280; font-size: 14px;">Questions? Just reply to this email and we'll help you out.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    CounterCart - Offset your purchases with purpose
  </p>
</body>
</html>
    `,
    text: `Hey ${firstName}!

Welcome to CounterCart! We're excited to have you join our community.

Here's how CounterCart works:
1. We track your purchases at businesses that may not align with your values
2. We calculate a round-up donation based on your preferences
3. You donate to charities that support the causes you care about

Get started at: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

Questions? Just reply to this email!

- The CounterCart Team`,
  });
}

export async function sendDonationConfirmation(
  email: string,
  name: string | undefined,
  charityName: string,
  amount: number,
  userId?: string
): Promise<boolean> {
  // Check user preference
  if (userId) {
    const shouldSend = await shouldSendNotification(userId, "notifyDonationComplete");
    if (!shouldSend) {
      logger.info("Skipping donation confirmation - user preference disabled", { userId, email });
      return true; // Return true to indicate "success" (intentionally not sent)
    }
  }

  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: email,
    subject: `Your $${amount.toFixed(2)} donation to ${charityName} is confirmed!`,
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

  <h2 style="color: #1f2937;">Thank you, ${firstName}!</h2>

  <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0; font-size: 18px; color: #166534;">Your donation of</p>
    <p style="margin: 10px 0; font-size: 36px; font-weight: bold; color: #15803d;">$${amount.toFixed(2)}</p>
    <p style="margin: 0; font-size: 18px; color: #166534;">to <strong>${charityName}</strong> has been confirmed!</p>
  </div>

  <p>Your generosity makes a real difference. Thank you for using CounterCart to offset your purchases with purpose.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/donations" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Donation History</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    CounterCart - Offset your purchases with purpose
  </p>
</body>
</html>
    `,
    text: `Thank you, ${firstName}!

Your donation of $${amount.toFixed(2)} to ${charityName} has been confirmed!

Your generosity makes a real difference. Thank you for using CounterCart to offset your purchases with purpose.

View your donation history: ${process.env.NEXT_PUBLIC_APP_URL}/donations

- The CounterCart Team`,
  });
}

export async function sendPaymentFailedEmail(
  email: string,
  name: string | undefined,
  userId?: string
): Promise<boolean> {
  // Check user preference
  if (userId) {
    const shouldSend = await shouldSendNotification(userId, "notifyPaymentFailed");
    if (!shouldSend) {
      logger.info("Skipping payment failed email - user preference disabled", { userId, email });
      return true;
    }
  }

  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: email,
    subject: "Action needed: Payment failed for your CounterCart subscription",
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

  <h2 style="color: #1f2937;">Hey ${firstName},</h2>

  <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0; color: #991b1b;">
      <strong>Your recent payment failed.</strong> Please update your payment method to continue your Premium subscription.
    </p>
  </div>

  <p>Without a valid payment method, your Premium features will be paused. Update your payment details to continue enjoying:</p>

  <ul style="padding-left: 20px;">
    <li>Auto-weekly donations</li>
    <li>Custom charity selection</li>
    <li>Higher donation limits</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
  </div>

  <p style="color: #6b7280; font-size: 14px;">If you have questions or need help, just reply to this email.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    CounterCart - Offset your purchases with purpose
  </p>
</body>
</html>
    `,
    text: `Hey ${firstName},

Your recent payment failed. Please update your payment method to continue your Premium subscription.

Without a valid payment method, your Premium features will be paused.

Update your payment method: ${process.env.NEXT_PUBLIC_APP_URL}/settings

Questions? Just reply to this email!

- The CounterCart Team`,
  });
}

export async function sendBankReconnectEmail(
  email: string,
  name: string | undefined,
  institutionName: string,
  userId?: string
): Promise<boolean> {
  // Check user preference
  if (userId) {
    const shouldSend = await shouldSendNotification(userId, "notifyBankDisconnected");
    if (!shouldSend) {
      logger.info("Skipping bank reconnect email - user preference disabled", { userId, email });
      return true;
    }
  }

  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: email,
    subject: `Action needed: Reconnect your ${institutionName} account`,
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

  <h2 style="color: #1f2937;">Hey ${firstName},</h2>

  <div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;">
      <strong>Your ${institutionName} connection needs attention.</strong> Please reconnect your account to continue tracking purchases.
    </p>
  </div>

  <p>This sometimes happens when:</p>
  <ul style="padding-left: 20px;">
    <li>You changed your bank password</li>
    <li>Your bank requires additional verification</li>
    <li>Your bank updated their security settings</li>
  </ul>

  <p>Reconnecting only takes a moment and ensures we can continue tracking your purchases to help you offset them with donations.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reconnect Bank Account</a>
  </div>

  <p style="color: #6b7280; font-size: 14px;">If you have questions or need help, just reply to this email.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    CounterCart - Offset your purchases with purpose
  </p>
</body>
</html>
    `,
    text: `Hey ${firstName},

Your ${institutionName} connection needs attention. Please reconnect your account to continue tracking purchases.

This sometimes happens when you change your bank password or your bank requires additional verification.

Reconnect your account: ${process.env.NEXT_PUBLIC_APP_URL}/settings

Questions? Just reply to this email!

- The CounterCart Team`,
  });
}

export async function sendWeeklySummaryEmail(
  email: string,
  name: string | undefined,
  userId: string,
  summary: {
    totalDonated: number;
    donationCount: number;
    topCharity?: string;
    matchedTransactions: number;
  }
): Promise<boolean> {
  // Check user preference
  const shouldSend = await shouldSendNotification(userId, "notifyWeeklySummary");
  if (!shouldSend) {
    logger.info("Skipping weekly summary - user preference disabled", { userId, email });
    return true;
  }

  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: email,
    subject: `Your weekly CounterCart summary: $${summary.totalDonated.toFixed(2)} donated`,
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

  <h2 style="color: #1f2937;">Hey ${firstName}, here's your week in impact!</h2>

  <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0; font-size: 16px; color: #166534;">This week you donated</p>
    <p style="margin: 10px 0; font-size: 42px; font-weight: bold; color: #15803d;">$${summary.totalDonated.toFixed(2)}</p>
    <p style="margin: 0; font-size: 14px; color: #166534;">${summary.donationCount} donation${summary.donationCount !== 1 ? "s" : ""} to causes you care about</p>
  </div>

  <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; font-weight: 600;">This week's stats:</p>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      <li>${summary.matchedTransactions} transaction${summary.matchedTransactions !== 1 ? "s" : ""} matched</li>
      ${summary.topCharity ? `<li>Top charity: ${summary.topCharity}</li>` : ""}
    </ul>
  </div>

  <p>Keep up the great work! Every donation makes a difference.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    CounterCart - Offset your purchases with purpose<br>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #9ca3af;">Manage email preferences</a>
  </p>
</body>
</html>
    `,
    text: `Hey ${firstName}, here's your week in impact!

This week you donated $${summary.totalDonated.toFixed(2)} across ${summary.donationCount} donation${summary.donationCount !== 1 ? "s" : ""}.

This week's stats:
- ${summary.matchedTransactions} transaction${summary.matchedTransactions !== 1 ? "s" : ""} matched
${summary.topCharity ? `- Top charity: ${summary.topCharity}` : ""}

Keep up the great work! Every donation makes a difference.

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

- The CounterCart Team

Manage email preferences: ${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });
}
