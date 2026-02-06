import { plaidClient, normalizeMerchantName } from "@/lib/plaid";
import prisma from "@/lib/prisma";
import { matchingService } from "./matching.service";
import { decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { RemovedTransaction, Transaction as PlaidTransaction, AccountBase } from "plaid";

export class PlaidService {
  /**
   * Sync transactions for a Plaid item
   */
  async syncTransactions(plaidItemId: string): Promise<{
    added: number;
    modified: number;
    removed: number;
    matched: number;
  }> {
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
      include: { bankAccounts: true, user: true },
    });

    if (!plaidItem) {
      throw new Error(`PlaidItem not found: ${plaidItemId}`);
    }

    const stats = { added: 0, modified: 0, removed: 0, matched: 0 };

    let cursor = plaidItem.cursor;
    let hasMore = true;

    // Decrypt access token for API calls
    const accessToken = decrypt(plaidItem.accessToken);

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
        count: 100,
      });

      // Process added transactions
      for (const txn of response.data.added) {
        const created = await this.processAddedTransaction(
          plaidItem.userId,
          plaidItem.id,
          txn
        );
        if (created) {
          stats.added++;

          // Try to match the transaction
          const result = await matchingService.processTransaction(
            plaidItem.userId,
            created.id
          );
          if (result.matched) {
            stats.matched++;
          }
        }
      }

      // Process modified transactions
      for (const txn of response.data.modified) {
        const modified = await this.processModifiedTransaction(txn);
        if (modified) {
          stats.modified++;
        }
      }

      // Process removed transactions
      for (const txn of response.data.removed) {
        const removed = await this.processRemovedTransaction(txn);
        if (removed) {
          stats.removed++;
        }
      }

      cursor = response.data.next_cursor;
      hasMore = response.data.has_more;
    }

    // Update cursor
    await prisma.plaidItem.update({
      where: { id: plaidItemId },
      data: { cursor },
    });

    return stats;
  }

  private async processAddedTransaction(
    userId: string,
    plaidItemId: string,
    txn: PlaidTransaction
  ) {
    // Skip pending transactions
    if (txn.pending) {
      return null;
    }

    // Skip if transaction already exists
    const existing = await prisma.transaction.findUnique({
      where: { plaidTransactionId: txn.transaction_id },
    });

    if (existing) {
      return null;
    }

    // Find the bank account
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        plaidAccountId: txn.account_id,
        plaidItemId,
      },
    });

    if (!bankAccount) {
      logger.error("Bank account not found for Plaid account", { plaidAccountId: txn.account_id, plaidItemId });
      return null;
    }

    // Create transaction
    return prisma.transaction.create({
      data: {
        userId,
        bankAccountId: bankAccount.id,
        plaidTransactionId: txn.transaction_id,
        merchantName: txn.merchant_name || txn.name,
        merchantNameNorm: normalizeMerchantName(txn.merchant_name || txn.name),
        amount: Math.abs(txn.amount), // Plaid returns negative for expenses
        date: new Date(txn.date),
        category: txn.category || [],
        status: "PENDING",
      },
    });
  }

  private async processModifiedTransaction(txn: PlaidTransaction) {
    // Find and update the transaction
    const existing = await prisma.transaction.findUnique({
      where: { plaidTransactionId: txn.transaction_id },
    });

    if (!existing) {
      return null;
    }

    return prisma.transaction.update({
      where: { id: existing.id },
      data: {
        merchantName: txn.merchant_name || txn.name,
        merchantNameNorm: normalizeMerchantName(txn.merchant_name || txn.name),
        amount: Math.abs(txn.amount),
        date: new Date(txn.date),
        category: txn.category || [],
      },
    });
  }

  private async processRemovedTransaction(txn: RemovedTransaction) {
    if (!txn.transaction_id) {
      return null;
    }

    // Find and delete the transaction
    const existing = await prisma.transaction.findUnique({
      where: { plaidTransactionId: txn.transaction_id },
    });

    if (!existing) {
      return null;
    }

    // Delete associated donation if exists
    await prisma.donation.deleteMany({
      where: { transactionId: existing.id },
    });

    // Delete the transaction
    await prisma.transaction.delete({
      where: { id: existing.id },
    });

    return existing;
  }

  /**
   * Sync transactions for all active Plaid items for a user
   */
  async syncAllUserTransactions(userId: string) {
    const plaidItems = await prisma.plaidItem.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    const results = [];

    for (const item of plaidItems) {
      try {
        const stats = await this.syncTransactions(item.id);
        results.push({ itemId: item.id, success: true, stats });
      } catch (error) {
        logger.error("Error syncing Plaid item", { itemId: item.id }, error);
        results.push({ itemId: item.id, success: false, error });
      }
    }

    return results;
  }

  /**
   * Get Auth data for a Plaid item (bank account numbers for ACH)
   */
  async getAuthData(plaidItemId: string): Promise<{
    accounts: Array<{
      accountId: string;
      name: string;
      mask: string | null;
      routingNumber: string;
      accountNumber: string;
    }>;
  }> {
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
    });

    if (!plaidItem) {
      throw new Error(`PlaidItem not found: ${plaidItemId}`);
    }

    const accessToken = decrypt(plaidItem.accessToken);

    const response = await plaidClient.authGet({
      access_token: accessToken,
    });

    const accounts = response.data.accounts
      .filter((account: AccountBase) =>
        account.type === "depository" &&
        (account.subtype === "checking" || account.subtype === "savings")
      )
      .map((account: AccountBase) => {
        const numbers = response.data.numbers.ach.find(
          (n) => n.account_id === account.account_id
        );
        return {
          accountId: account.account_id,
          name: account.name,
          mask: account.mask,
          routingNumber: numbers?.routing || "",
          accountNumber: numbers?.account || "",
        };
      })
      .filter((a) => a.routingNumber && a.accountNumber);

    return { accounts };
  }

  /**
   * Create a Stripe bank account token via Plaid processor integration
   */
  async createStripeBankAccountToken(
    plaidItemId: string,
    accountId: string
  ): Promise<string> {
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
    });

    if (!plaidItem) {
      throw new Error(`PlaidItem not found: ${plaidItemId}`);
    }

    const accessToken = decrypt(plaidItem.accessToken);

    const response = await plaidClient.processorStripeBankAccountTokenCreate({
      access_token: accessToken,
      account_id: accountId,
    });

    return response.data.stripe_bank_account_token;
  }
}

export const plaidService = new PlaidService();
