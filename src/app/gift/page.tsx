"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { track, AnalyticsEvents } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Heart,
  Sparkles,
  Loader2,
  Check,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface GiftOption {
  months: number;
  price: number;
  pricePerMonth: number;
  label: string;
  savings?: number;
}

const giftOptions: GiftOption[] = [
  {
    months: 3,
    price: 14.97,
    pricePerMonth: 4.99,
    label: "3 Months",
  },
  {
    months: 6,
    price: 29.94,
    pricePerMonth: 4.99,
    label: "6 Months",
  },
  {
    months: 12,
    price: 59.88,
    pricePerMonth: 4.99,
    label: "12 Months",
    savings: 0,
  },
];

export default function GiftPage() {
  const [selectedOption, setSelectedOption] = useState<GiftOption>(giftOptions[2]); // Default to 12 months
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    track(AnalyticsEvents.GIFT_PAGE_VIEWED);

    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/user/settings");
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            setSenderName(data.name);
          }
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handlePurchase = async () => {
    if (!recipientEmail) {
      toast.error("Please enter the recipient's email");
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/gift/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          months: selectedOption.months,
          recipientEmail,
          recipientName: recipientName || undefined,
          personalMessage: personalMessage || undefined,
          senderName: senderName || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      track(AnalyticsEvents.GIFT_PURCHASED, { value: Math.round(selectedOption.price * 100) });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error creating gift checkout:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-primary text-foreground hover:bg-accent hover:text-accent-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login?redirect=/gift">
              <Button variant="outline" size="sm" className="border-primary text-foreground hover:bg-accent hover:text-accent-foreground">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Gift Premium Membership
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Give the gift of purposeful giving. Help someone you care about turn their everyday purchases into donations that make a difference.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Gift Card Preview */}
          <div className="order-2 lg:order-1">
            <Card className="overflow-hidden border-2 border-primary/20">
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-accent border-2 border-primary flex items-center justify-center font-mono font-bold text-primary">
                    ↻
                  </div>
                  <span className="headline text-lg tracking-wider">COUNTERCART</span>
                </div>
                <div className="mt-8">
                  <p className="text-sm opacity-80 mb-1">Gift for</p>
                  <p className="text-2xl font-semibold">
                    {recipientName || recipientEmail || "Your recipient"}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-lg font-medium">
                    {selectedOption.months} Months of Premium
                  </span>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Personal Message</p>
                    <p className="text-sm text-muted-foreground">
                      {personalMessage || "Add a personal message to make it special..."}
                    </p>
                  </div>
                </div>
                {senderName && (
                  <p className="text-sm text-muted-foreground text-right">
                    From: {senderName}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Premium Benefits Included</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Automatic weekly donations",
                  "Custom charity selection per cause",
                  "Unlimited donation multiplier",
                  "Priority support",
                  "Early access to new features",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Purchase Form */}
          <div className="order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Gift</CardTitle>
                <CardDescription>
                  Select the duration and personalize your gift
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Duration Selection */}
                <div className="space-y-3">
                  <Label>Gift Duration</Label>
                  <div className="grid gap-3">
                    {giftOptions.map((option) => (
                      <button
                        key={option.months}
                        onClick={() => setSelectedOption(option)}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          selectedOption.months === option.months
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              selectedOption.months === option.months
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          />
                          <div className="text-left">
                            <p className="font-medium">{option.label}</p>
                            <p className="text-sm text-muted-foreground">
                              ${option.pricePerMonth.toFixed(2)}/month
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${option.price.toFixed(2)}</p>
                          {option.months === 12 && (
                            <Badge variant="secondary" className="text-xs">
                              Best Value
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">Recipient Email *</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      placeholder="friend@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send the gift notification to this email
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                    <Input
                      id="recipientName"
                      placeholder="Their name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="senderName">Your Name (Optional)</Label>
                    <Input
                      id="senderName"
                      placeholder="Your name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <textarea
                      id="message"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Write a heartfelt message..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {personalMessage.length}/500
                    </p>
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="pt-4">
                  {isAuthenticated ? (
                    <Button
                      onClick={handlePurchase}
                      disabled={isLoading || !recipientEmail}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting to checkout...
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          Purchase Gift - ${selectedOption.price.toFixed(2)}
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button asChild className="w-full" size="lg">
                        <Link href={`/login?redirect=/gift`}>
                          Sign in to Purchase
                        </Link>
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        You need to sign in to purchase a gift subscription
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Gift codes are valid for 1 year from purchase. The recipient will receive
                  an email with instructions to redeem.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
