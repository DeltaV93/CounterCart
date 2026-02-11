"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track, AnalyticsEvents } from "@/lib/analytics";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Heart,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  PartyPopper,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface GiftDetails {
  id: string;
  code: string;
  recipientEmail: string;
  recipientName?: string;
  purchaserName?: string;
  personalMessage?: string;
  months: number;
  amount: number;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function RedeemGiftPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [gift, setGift] = useState<GiftDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  useEffect(() => {
    const fetchGiftDetails = async () => {
      try {
        const response = await fetch(`/api/gift/details?code=${code}`);

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Gift not found");
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setGift(data);
      } catch (err) {
        console.error("Error fetching gift:", err);
        setError("Failed to load gift details");
      } finally {
        setIsLoading(false);
      }
    };

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/user/settings");
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const data = await response.json();
          setCurrentUserEmail(data.email);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    fetchGiftDetails();
    checkAuth();
  }, [code]);

  const handleRedeem = async () => {
    if (!gift) return;

    setIsRedeeming(true);

    try {
      const response = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: gift.code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to redeem gift");
      }

      track(AnalyticsEvents.GIFT_REDEEMED);
      setRedeemSuccess(true);
      toast.success("Gift redeemed successfully!");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard?gift=redeemed");
      }, 3000);
    } catch (error) {
      console.error("Error redeeming gift:", error);
      toast.error(error instanceof Error ? error.message : "Failed to redeem gift");
      setIsRedeeming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = gift ? new Date(gift.expiresAt) < new Date() : false;

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading gift details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Gift Not Found</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (redeemSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-6">
              <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Premium!</h2>
            <p className="text-muted-foreground mb-4">
              Your {gift?.months}-month Premium membership is now active.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Redirecting you to your dashboard...
            </p>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gift) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[var(--counter-cream)] border-b-2 border-primary">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent border-2 border-primary flex items-center justify-center font-mono font-bold text-primary">
              ↻
            </div>
            <span className="headline text-foreground text-lg tracking-wider hidden sm:inline">
              COUNTERCART
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-lg">
        {/* Gift Card */}
        <Card className="overflow-hidden border-2 border-primary/20">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent border-2 border-primary flex items-center justify-center font-mono font-bold text-primary">
                ↻
              </div>
              <span className="headline text-lg tracking-wider">COUNTERCART</span>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <Gift className="h-8 w-8" />
              <div>
                <p className="text-sm opacity-80">You&apos;ve received</p>
                <p className="text-2xl font-bold">
                  {gift.months} Months of Premium
                </p>
              </div>
            </div>

            {gift.purchaserName && (
              <p className="mt-4 text-sm opacity-80">
                From: {gift.purchaserName}
              </p>
            )}
          </div>

          {gift.personalMessage && (
            <div className="p-6 border-b">
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Personal Message</p>
                  <p className="text-muted-foreground">{gift.personalMessage}</p>
                </div>
              </div>
            </div>
          )}

          <CardContent className="p-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground">Status</span>
              {gift.status === "redeemed" ? (
                <Badge variant="secondary">Already Redeemed</Badge>
              ) : isExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant="default" className="bg-green-600">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Ready to Redeem
                </Badge>
              )}
            </div>

            {/* Expiry Info */}
            {gift.status !== "redeemed" && !isExpired && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Clock className="h-4 w-4" />
                <span>Expires {formatDate(gift.expiresAt)}</span>
              </div>
            )}

            {/* Benefits */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="font-medium mb-3">Premium Benefits</p>
              <div className="space-y-2">
                {[
                  "Automatic weekly donations",
                  "Custom charity selection",
                  "Unlimited donation multiplier",
                  "Priority support",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {gift.status === "redeemed" ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  This gift has already been redeemed.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">Return Home</Link>
                </Button>
              </div>
            ) : isExpired ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  This gift code has expired and can no longer be redeemed.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">Return Home</Link>
                </Button>
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-3">
                <Button
                  onClick={handleRedeem}
                  disabled={isRedeeming}
                  className="w-full"
                  size="lg"
                >
                  {isRedeeming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating Premium...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Redeem Gift
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Redeeming as {currentUserEmail}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Sign in or create an account to redeem your gift
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/login?redirect=/gift/redeem/${code}`}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/signup?redirect=/gift/redeem/${code}`}>
                      Sign Up
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
