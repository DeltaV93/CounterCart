"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TransactionFilters,
  type TransactionFilters as Filters,
} from "@/components/TransactionFilters";
import { CreditCard, ArrowUpRight, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  status: string;
  category: string[];
  matchedMapping: {
    charityName: string;
    causeName: string;
  } | null;
  donation: {
    id: string;
    amount: number;
    status: string;
    charityName: string;
  } | null;
}

const defaultFilters: Filters = {
  search: "",
  status: "all",
  startDate: "",
  endDate: "",
  sortBy: "date",
  sortOrder: "desc",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  MATCHED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  BATCHED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DONATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  SKIPPED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const ITEMS_PER_PAGE = 20;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(0);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("sortBy", filters.sortBy);
      params.set("sortOrder", filters.sortOrder);
      params.set("limit", ITEMS_PER_PAGE.toString());
      params.set("offset", (page * ITEMS_PER_PAGE).toString());

      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View all your matched transactions and their donation status
        </p>
      </div>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleReset}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${total} transaction${total !== 1 ? "s" : ""} found`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            filters.search || filters.status !== "all" || filters.startDate || filters.endDate ? (
              <EmptyState
                icon={CreditCard}
                title="No transactions found"
                description="Try adjusting your filters to find what you're looking for."
              />
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No transactions yet"
                description="Transactions will appear here once we start syncing your bank data."
                action={{
                  label: "Connect Bank",
                  href: "/onboarding/connect",
                  icon: Building2,
                }}
              />
            )
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
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
                    <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                    <Badge className={statusColors[transaction.status]}>
                      {transaction.status.toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
