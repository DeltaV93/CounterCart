import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowUpRight } from "lucide-react";

export default async function TransactionsPage() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: {
      matchedMapping: {
        include: { cause: true },
      },
      donation: true,
    },
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    MATCHED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    BATCHED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    DONATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    SKIPPED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View all your matched transactions and their donation status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">No transactions yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Transactions will appear here once we start syncing your bank data
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{transaction.merchantName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                        {transaction.matchedMapping && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" />
                              {transaction.matchedMapping.charityName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${transaction.amount.toNumber().toFixed(2)}
                    </p>
                    <Badge className={statusColors[transaction.status]}>
                      {transaction.status.toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
