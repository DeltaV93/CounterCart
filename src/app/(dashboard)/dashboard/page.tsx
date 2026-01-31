import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  TrendingUp,
  CreditCard,
  Gift,
  ArrowRight,
  Building2,
  Sparkles,
} from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";

async function DashboardStats() {
  const user = await requireUser();

  // Get stats
  const [totalDonations, totalTransactions, pendingDonations, userCauses] =
    await Promise.all([
      prisma.donation.aggregate({
        where: {
          userId: user.id,
          status: "COMPLETED",
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.count({
        where: {
          userId: user.id,
          status: "MATCHED",
        },
      }),
      prisma.donation.count({
        where: {
          userId: user.id,
          status: "PENDING",
        },
      }),
      prisma.userCause.count({
        where: { userId: user.id },
      }),
    ]);

  const totalDonated = totalDonations._sum.amount?.toNumber() || 0;
  const donationCount = totalDonations._count;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalDonated.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            {donationCount} donation{donationCount !== 1 ? "s" : ""} made
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Matched Transactions
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">
            Purchases detected at matching businesses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Donations</CardTitle>
          <Gift className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingDonations}</div>
          <p className="text-xs text-muted-foreground">
            Ready to be processed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Causes</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userCauses}</div>
          <p className="text-xs text-muted-foreground">
            Causes you&apos;re supporting
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function RecentActivity() {
  const user = await requireUser();

  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      status: { in: ["MATCHED", "DONATED"] },
    },
    orderBy: { date: "desc" },
    take: 5,
    include: {
      matchedMapping: true,
      donation: true,
    },
  });

  if (recentTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your matched transactions will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium">No activity yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your bank to start tracking purchases
            </p>
            <Link href="/onboarding/connect" className="mt-4">
              <Button>
                <Building2 className="mr-2 h-4 w-4" />
                Connect Bank
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest matched transactions</CardDescription>
        </div>
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{transaction.merchantName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  ${transaction.amount.toNumber().toFixed(2)}
                </p>
                <Badge
                  variant={
                    transaction.status === "DONATED" ? "default" : "secondary"
                  }
                >
                  {transaction.status === "DONATED" ? "Donated" : "Pending"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function PendingBatch() {
  const user = await requireUser();

  const pendingDonations = await prisma.donation.findMany({
    where: {
      userId: user.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (pendingDonations.length === 0) {
    return null;
  }

  const totalAmount = pendingDonations.reduce(
    (sum, d) => sum + d.amount.toNumber(),
    0
  );

  return (
    <Card className="border-primary">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Ready to Donate</CardTitle>
        </div>
        <CardDescription>
          You have {pendingDonations.length} pending donation
          {pendingDonations.length > 1 ? "s" : ""} totaling ${totalAmount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingDonations.slice(0, 3).map((donation) => (
            <div
              key={donation.id}
              className="flex items-center justify-between text-sm"
            >
              <span>{donation.charityName}</span>
              <span className="font-medium">
                ${donation.amount.toNumber().toFixed(2)}
              </span>
            </div>
          ))}
          {pendingDonations.length > 3 && (
            <p className="text-sm text-muted-foreground">
              +{pendingDonations.length - 3} more
            </p>
          )}
        </div>
        <Link href="/donations" className="block mt-4">
          <Button className="w-full">
            <Gift className="mr-2 h-4 w-4" />
            Complete Donations
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your impact and manage your donations
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      {/* Charts */}
      <DashboardCharts />

      <div className="grid gap-4 md:grid-cols-2">
        <Suspense
          fallback={
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          }
        >
          <RecentActivity />
        </Suspense>

        <Suspense fallback={null}>
          <PendingBatch />
        </Suspense>
      </div>
    </div>
  );
}
