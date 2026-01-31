import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function DELETE() {
  try {
    const user = await requireUser();

    logger.info("Starting account deletion", { userId: user.id });

    // 1. Cancel Stripe subscription if exists
    if (user.stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "active",
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
          logger.info("Cancelled Stripe subscription", {
            userId: user.id,
            subscriptionId: subscription.id,
          });
        }
      } catch (error) {
        logger.error("Error cancelling Stripe subscription", { userId: user.id }, error);
        // Continue with deletion even if Stripe fails
      }
    }

    // 2. Disconnect Plaid items
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: user.id },
    });

    for (const item of plaidItems) {
      try {
        const accessToken = decrypt(item.accessToken);
        await plaidClient.itemRemove({ access_token: accessToken });
        logger.info("Removed Plaid item", {
          userId: user.id,
          itemId: item.itemId,
        });
      } catch (error) {
        logger.error("Error removing Plaid item", {
          userId: user.id,
          itemId: item.itemId,
        }, error);
        // Continue with deletion even if Plaid fails
      }
    }

    // 3. Delete user from database (cascades to related records)
    await prisma.user.delete({
      where: { id: user.id },
    });

    logger.info("Deleted user from database", { userId: user.id });

    // 4. Delete user from Supabase Auth
    const supabase = await createClient();

    // Sign out the user first
    await supabase.auth.signOut();

    logger.info("Account deletion completed", { userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting account", undefined, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
