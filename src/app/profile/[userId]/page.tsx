import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, TrendingUp, Users, Calendar, Award, ExternalLink } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { userId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, publicProfile: true },
  });

  if (!user || !user.publicProfile) {
    return {
      title: "Profile Not Found | CounterCart",
    };
  }

  const title = user.name
    ? `${user.name}'s Profile | CounterCart`
    : "CounterCart Profile";

  return {
    title,
    description:
      "See how this CounterCart user is making a difference by offsetting purchases at businesses with questionable practices.",
    openGraph: {
      title,
      description:
        "See how this CounterCart user is making a difference by offsetting purchases at businesses with questionable practices.",
      images: [`${appUrl}/api/badge/${userId}?style=detailed`],
      type: "profile",
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

// Badge display names
const BADGE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  early_adopter: {
    label: "Early Adopter",
    description: "Joined during the first month",
    color: "bg-blue-500",
  },
  first_donation: {
    label: "First Donation",
    description: "Made their first donation",
    color: "bg-green-500",
  },
  century_club: {
    label: "Century Club",
    description: "Donated over $100",
    color: "bg-yellow-500",
  },
  five_causes: {
    label: "Diversified",
    description: "Supporting 5+ causes",
    color: "bg-purple-500",
  },
  referral_champion: {
    label: "Referral Champion",
    description: "Referred 5+ users",
    color: "bg-pink-500",
  },
  challenge_winner: {
    label: "Challenge Winner",
    description: "Completed a donation challenge",
    color: "bg-orange-500",
  },
  consistent_giver: {
    label: "Consistent Giver",
    description: "Donated every month for 6 months",
    color: "bg-teal-500",
  },
  impact_leader: {
    label: "Impact Leader",
    description: "Donated over $1,000",
    color: "bg-red-500",
  },
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;

  // Fetch user with their public data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      publicProfile: true,
      badgeEnabled: true,
      badges: true,
      referralCode: true,
      createdAt: true,
      userCauses: {
        include: {
          cause: {
            select: {
              name: true,
              iconName: true,
              color: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.publicProfile) {
    notFound();
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

  // Get unique charities donated to
  const charitiesCount = await prisma.donation.groupBy({
    by: ["charityId"],
    where: {
      userId: userId,
      status: "COMPLETED",
    },
  });

  const totalDonated = donationStats._sum.amount?.toNumber() || 0;
  const donationCount = donationStats._count;
  const memberSince = user.createdAt;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

  // Filter valid badges
  const userBadges = (user.badges || []).filter(
    (b): b is string => typeof b === "string" && b in BADGE_LABELS
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          {/* Avatar placeholder */}
          <div className="w-24 h-24 mx-auto bg-accent border-2 border-primary flex items-center justify-center">
            <span className="text-4xl font-display text-accent-foreground">
              {user.name ? user.name.charAt(0).toUpperCase() : "?"}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-display uppercase tracking-wider">
              {user.name || "Anonymous User"}
            </h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2 mt-2">
              <Calendar className="h-4 w-4" />
              Member since {memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="font-display text-3xl text-green-500">
                ${totalDonated.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Total Donated
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="font-display text-3xl text-accent">
                {donationCount}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Donations
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="font-display text-3xl text-highlight">
                {user.userCauses.length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Causes
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="font-display text-3xl text-primary">
                {charitiesCount.length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Charities
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Causes Supported */}
        {user.userCauses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-highlight" />
                Causes Supported
              </CardTitle>
              <CardDescription>
                Causes this user is actively supporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.userCauses.map((uc) => (
                  <Badge
                    key={uc.id}
                    variant="secondary"
                    className="text-sm py-1 px-3"
                  >
                    {uc.cause.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badges Earned */}
        {userBadges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Badges Earned
              </CardTitle>
              <CardDescription>
                Recognition for making an impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userBadges.map((badgeKey) => {
                  const badge = BADGE_LABELS[badgeKey];
                  return (
                    <div
                      key={badgeKey}
                      className="flex items-start gap-3 p-3 bg-muted/50 border border-border"
                    >
                      <div
                        className={`w-8 h-8 ${badge.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <Award className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{badge.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {badge.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badge Preview (if enabled) */}
        {user.badgeEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>Impact Badge</CardTitle>
              <CardDescription>
                Embed this badge on your website or profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${appUrl}/api/badge/${userId}?style=detailed`}
                  alt="Impact Badge"
                  className="border-2 border-primary"
                />
              </div>
              <div className="text-center">
                <Link href={`/badge/${userId}`}>
                  <Button variant="outline" size="sm">
                    Get Embed Code
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Join CTA */}
        <Card className="border-accent">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="font-display text-xl uppercase tracking-wider">
              Join the Movement
            </h3>
            <p className="text-muted-foreground">
              Start offsetting your purchases and make a difference today.
            </p>
            <Button asChild size="lg">
              <Link href={user.referralCode ? `/r/${user.referralCode}` : "/signup"}>
                Get Started Free
              </Link>
            </Button>
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
      </div>
    </div>
  );
}
