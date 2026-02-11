import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { publicStatsService } from "@/services/public-stats.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyRankings } from "@/components/leaderboard/CompanyRankings";
import { CauseRankings } from "@/components/leaderboard/CauseRankings";
import { EmbedCodeGenerator } from "@/components/leaderboard/EmbedCodeGenerator";
import { ArrowRight, Heart, TrendingUp, Users } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

export const metadata: Metadata = {
  title: "Community Leaderboards",
  description:
    "See the collective impact of the CounterCart community. Track total donations, most offset companies, and top causes funded.",
  openGraph: {
    title: "CounterCart Community Leaderboards",
    description:
      "See the collective impact of the CounterCart community. Track total donations, most offset companies, and top causes funded.",
    images: [`${baseUrl}/api/public/og`],
  },
  twitter: {
    card: "summary_large_image",
    title: "CounterCart Community Leaderboards",
    description:
      "See the collective impact of the CounterCart community. Track total donations, most offset companies, and top causes funded.",
    images: [`${baseUrl}/api/public/og`],
  },
};

async function StatsOverview() {
  const stats = await publicStatsService.getStats();

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(stats.totalDonated);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card variant="accent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="headline text-4xl">{formattedTotal}</div>
          <p className="text-xs text-muted-foreground">
            Across all CounterCart users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="headline text-4xl">{stats.totalUsers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Making a difference every day
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Causes Funded</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="headline text-4xl">{stats.topCauses.length}</div>
          <p className="text-xs text-muted-foreground">
            Different causes receiving support
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function LeaderboardTabs() {
  const stats = await publicStatsService.getStats();

  return (
    <Tabs defaultValue="companies" className="w-full">
      <TabsList className="w-full md:w-auto mb-6">
        <TabsTrigger value="companies">Most Offset Companies</TabsTrigger>
        <TabsTrigger value="causes">Top Causes Funded</TabsTrigger>
      </TabsList>

      <TabsContent value="companies">
        <CompanyRankings companies={stats.topCompaniesOffset} />
      </TabsContent>

      <TabsContent value="causes">
        <CauseRankings causes={stats.topCauses} />
      </TabsContent>
    </Tabs>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32 mb-1" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeaderboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Card>
        <CardContent className="py-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-4">
              <Skeleton className="h-8 w-8" />
              <div className="flex-1">
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LeaderboardsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[var(--counter-cream)] border-b-2 border-primary py-4">
        <div className="container mx-auto flex items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent border-2 border-primary flex items-center justify-center font-mono font-bold text-primary">
              {"↻"}
            </div>
            <span className="headline text-foreground text-xl tracking-wider">
              COUNTERCART
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/signup">
              <Button size="sm">GET STARTED</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 px-4 md:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <span className="text-accent text-sm tracking-widest">
            COMMUNITY IMPACT
          </span>
          <h1 className="headline text-5xl md:text-6xl mt-4 mb-6">
            TOGETHER, WE&apos;RE MAKING A DIFFERENCE
          </h1>
          <p className="text-muted-gray max-w-xl mx-auto text-lg">
            See the collective power of conscious consumers offsetting their purchases
            and funding causes that matter.
          </p>
        </div>
      </section>

      {/* Main content */}
      <main className="py-12 px-4 md:px-8">
        <div className="container mx-auto max-w-4xl">
          {/* Stats Overview */}
          <Suspense fallback={<StatsLoading />}>
            <StatsOverview />
          </Suspense>

          {/* Leaderboard Tabs */}
          <Suspense fallback={<LeaderboardLoading />}>
            <LeaderboardTabs />
          </Suspense>

          {/* Embed Code Generator */}
          <div className="mt-12">
            <EmbedCodeGenerator baseUrl={baseUrl} />
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Card variant="highlight" className="inline-block p-8">
              <h2 className="headline text-3xl mb-4">WANT TO JOIN THE MOVEMENT?</h2>
              <p className="text-muted-foreground mb-6">
                Turn your spending habits into giving habits. It takes 2 minutes.
              </p>
              <Link href="/signup">
                <Button size="lg" className="headline tracking-wider">
                  CREATE YOUR ACCOUNT
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-10 px-4 md:px-8 mt-12">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="headline text-xl tracking-wider mb-1">COUNTERCART</div>
            <p className="text-muted-gray text-sm">
              Spend. <span className="text-accent">Offset. Give back.</span>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/" className="text-sm hover:text-accent transition-colors">
              Home
            </Link>
            <Link
              href="/leaderboards"
              className="text-sm hover:text-accent transition-colors"
            >
              Leaderboards
            </Link>
            <Link href="/faq" className="text-sm hover:text-accent transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="text-sm hover:text-accent transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm hover:text-accent transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
