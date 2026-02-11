import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart, Users, TrendingUp } from "lucide-react";

interface ReferralPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: ReferralPageProps): Promise<Metadata> {
  const { code } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

  // Find referrer
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { name: true },
  });

  const title = referrer?.name
    ? `${referrer.name} invited you to CounterCart`
    : "Join CounterCart - Offset Your Impact";

  return {
    title,
    description:
      "Turn your everyday purchases into charitable impact. Offset purchases at businesses with questionable practices by automatically donating to opposing causes.",
    openGraph: {
      title,
      description:
        "Turn your everyday purchases into charitable impact. Offset purchases at businesses with questionable practices by automatically donating to opposing causes.",
      images: [`${appUrl}/api/share/receipt/${code}`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description:
        "Turn your everyday purchases into charitable impact. Offset purchases at businesses with questionable practices by automatically donating to opposing causes.",
      images: [`${appUrl}/api/share/receipt/${code}`],
    },
  };
}

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { code } = await params;

  // Validate referral code exists
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      id: true,
      name: true,
      referralCount: true,
    },
  });

  if (!referrer) {
    // Invalid code - redirect to regular signup
    redirect("/signup");
  }

  // Get referrer's donation stats
  const stats = await prisma.donation.aggregate({
    where: {
      userId: referrer.id,
      status: "COMPLETED",
    },
    _sum: { amount: true },
    _count: true,
  });

  const totalDonated = Number(stats._sum.amount || 0);

  // Store referral code in cookie for signup flow
  const cookieStore = await cookies();
  cookieStore.set("referral_code", code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Referral Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 text-sm font-display uppercase tracking-wider border-2 border-primary">
            <Heart className="h-4 w-4" />
            Invited by {referrer.name || "a friend"}
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              Offset Your Purchases
            </CardTitle>
            <CardDescription className="text-base">
              When you shop at businesses with questionable practices, automatically donate to opposing causes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-highlight">
                  ${totalDonated.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Donated by {referrer.name?.split(" ")[0] || "referrer"}
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-accent">
                  {referrer.referralCount}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  People Invited
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="space-y-3">
              <div className="font-display text-sm uppercase tracking-wider">
                How It Works
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground flex items-center justify-center font-display text-xs border border-primary">
                    1
                  </div>
                  <div>Connect your bank to track purchases</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground flex items-center justify-center font-display text-xs border border-primary">
                    2
                  </div>
                  <div>Select causes you care about</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground flex items-center justify-center font-display text-xs border border-primary">
                    3
                  </div>
                  <div>We match purchases &amp; suggest donations</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href={`/signup?ref=${code}`}>
                  Join CounterCart
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
      </div>
    </div>
  );
}
