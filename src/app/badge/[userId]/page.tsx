import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, Users, ExternalLink } from "lucide-react";

interface BadgeClickPageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({
  params,
}: BadgeClickPageProps): Promise<Metadata> {
  const { userId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, badgeEnabled: true },
  });

  if (!user || !user.badgeEnabled) {
    return {
      title: "CounterCart - Offset Your Impact",
    };
  }

  const title = user.name
    ? `${user.name}'s Impact | CounterCart`
    : "Impact Badge | CounterCart";

  return {
    title,
    description:
      "See how this CounterCart user is making a difference by offsetting purchases at businesses with questionable practices.",
    openGraph: {
      title,
      description:
        "See how this CounterCart user is making a difference by offsetting purchases at businesses with questionable practices.",
      images: [`${appUrl}/api/badge/${userId}?style=detailed`],
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description:
        "See how this CounterCart user is making a difference by offsetting purchases at businesses with questionable practices.",
      images: [`${appUrl}/api/badge/${userId}?style=detailed`],
    },
  };
}

export default async function BadgeClickPage({ params }: BadgeClickPageProps) {
  const { userId } = await params;

  // Fetch user and their stats
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      badgeEnabled: true,
      publicProfile: true,
      referralCode: true,
    },
  });

  if (!user || !user.badgeEnabled) {
    redirect("/");
  }

  // Get aggregate donation stats (no transaction details for privacy)
  const donationStats = await prisma.donation.aggregate({
    where: {
      userId: userId,
      status: "COMPLETED",
    },
    _sum: { amount: true },
    _count: true,
  });

  // Get count of causes supported
  const causesCount = await prisma.userCause.count({
    where: { userId: userId },
  });

  const totalDonated = donationStats._sum.amount?.toNumber() || 0;
  const donationCount = donationStats._count;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-highlight text-highlight-foreground px-4 py-2 text-sm font-display uppercase tracking-wider border-2 border-primary">
            <Heart className="h-4 w-4" />
            Impact Badge
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              {user.name ? `${user.name}'s Impact` : "CounterCart Impact"}
            </CardTitle>
            <CardDescription className="text-base">
              Making a difference by offsetting harmful business practices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-green-500">
                  ${totalDonated.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Donated
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-accent">
                  {donationCount}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Donations
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-highlight">
                  {causesCount}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Causes
                </div>
              </div>
            </div>

            {/* View Full Profile Link (if public profile enabled) */}
            {user.publicProfile && (
              <div className="text-center">
                <Link href={`/profile/${userId}`}>
                  <Button variant="outline" size="sm">
                    View Full Profile
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}

            {/* What is CounterCart */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="font-display text-sm uppercase tracking-wider text-center">
                What is CounterCart?
              </div>
              <p className="text-sm text-muted-foreground text-center">
                CounterCart automatically matches your purchases at businesses with
                questionable practices and suggests donations to opposing charitable
                causes.
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href={user.referralCode ? `/r/${user.referralCode}` : "/signup"}>
                  Start Offsetting Your Impact
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Free to start. Premium features available.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="flex justify-center gap-8 text-muted-foreground text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>5,000+ users</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>$100K+ donated</span>
          </div>
        </div>

        {/* Badge Preview */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Badge Preview
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${appUrl}/api/badge/${userId}?style=detailed`}
            alt="Impact Badge"
            className="mx-auto border-2 border-primary"
          />
        </div>
      </div>
    </div>
  );
}
