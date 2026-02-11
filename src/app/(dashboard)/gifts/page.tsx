"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Gift,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface GiftSubscription {
  id: string;
  code: string;
  recipientEmail: string;
  personalMessage: string | null;
  amount: number;
  months: number;
  status: string;
  sentAt: string | null;
  redeemedAt: string | null;
  expiresAt: string;
  createdAt: string;
  redeemer?: {
    email: string;
    name: string | null;
  } | null;
  purchaser?: {
    email: string;
    name: string | null;
  } | null;
}

interface GiftsResponse {
  purchased: GiftSubscription[];
  received: GiftSubscription[];
}

function GiftsContent() {
  const searchParams = useSearchParams();
  const [gifts, setGifts] = useState<GiftsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Handle successful purchase redirect
    const purchase = searchParams.get("purchase");
    const code = searchParams.get("code");

    if (purchase === "success" && code) {
      toast.success("Gift purchased successfully! The recipient will receive an email.");
      track(AnalyticsEvents.GIFT_SENT);
      // Clean up URL
      window.history.replaceState({}, "", "/gifts");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const response = await fetch("/api/user/gifts");
        if (response.ok) {
          const data = await response.json();
          setGifts(data);
        }
      } catch (error) {
        console.error("Error fetching gifts:", error);
        toast.error("Failed to load gifts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGifts();
  }, []);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Gift code copied to clipboard");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const copyRedeemLink = async (code: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${appUrl}/gift/redeem/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Redeem link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (gift: GiftSubscription) => {
    const isExpired = new Date(gift.expiresAt) < new Date();

    if (gift.status === "redeemed") {
      return <Badge variant="secondary">Redeemed</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (gift.status === "sent") {
      return <Badge variant="default" className="bg-green-600">Sent</Badge>;
    }
    if (gift.status === "pending") {
      return <Badge variant="outline">Pending Payment</Badge>;
    }
    return <Badge variant="outline">{gift.status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasPurchased = gifts?.purchased && gifts.purchased.length > 0;
  const hasReceived = gifts?.received && gifts.received.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gift Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage gifts you&apos;ve purchased or received
          </p>
        </div>
        <Button asChild>
          <Link href="/gift">
            <Plus className="mr-2 h-4 w-4" />
            Buy a Gift
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="purchased">
        <TabsList>
          <TabsTrigger value="purchased" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Purchased ({gifts?.purchased?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Received ({gifts?.received?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchased" className="mt-6">
          {!hasPurchased ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                  <Gift className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No gifts purchased yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Give the gift of purposeful giving. Purchase a Premium membership for someone you care about.
                </p>
                <Button asChild>
                  <Link href="/gift">
                    <Gift className="mr-2 h-4 w-4" />
                    Purchase a Gift
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Gifts You&apos;ve Purchased</CardTitle>
                <CardDescription>
                  Track the status of gifts you&apos;ve sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gifts?.purchased.map((gift) => (
                      <TableRow key={gift.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{gift.recipientEmail}</p>
                            {gift.redeemer?.name && (
                              <p className="text-sm text-muted-foreground">
                                {gift.redeemer.name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{gift.months} months</TableCell>
                        <TableCell>{getStatusBadge(gift)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(gift.createdAt)}</p>
                            {gift.redeemedAt && (
                              <p className="text-muted-foreground">
                                Redeemed {formatDate(gift.redeemedAt)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {gift.status !== "redeemed" && gift.status !== "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCode(gift.code)}
                                >
                                  {copiedCode === gift.code ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyRedeemLink(gift.code)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Gift Details</DialogTitle>
                                  <DialogDescription>
                                    Gift subscription for {gift.recipientEmail}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Gift Code</p>
                                      <p className="font-mono">{gift.code}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Duration</p>
                                      <p>{gift.months} months</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Amount</p>
                                      <p>${gift.amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                                      {getStatusBadge(gift)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                                      <p>{formatDate(gift.createdAt)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Expires</p>
                                      <p>{formatDate(gift.expiresAt)}</p>
                                    </div>
                                  </div>
                                  {gift.personalMessage && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Personal Message</p>
                                      <p className="text-sm bg-muted p-3 rounded-md">{gift.personalMessage}</p>
                                    </div>
                                  )}
                                  {gift.status !== "redeemed" && gift.status !== "pending" && (
                                    <div className="flex gap-2 pt-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => copyCode(gift.code)}
                                        className="flex-1"
                                      >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Code
                                      </Button>
                                      <Button
                                        onClick={() => copyRedeemLink(gift.code)}
                                        className="flex-1"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Copy Link
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-6">
          {!hasReceived ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No gifts received yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  When someone sends you a gift subscription, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Gifts You&apos;ve Received</CardTitle>
                <CardDescription>
                  Premium memberships gifted to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Redeemed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gifts?.received.map((gift) => (
                      <TableRow key={gift.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {gift.purchaser?.name || gift.purchaser?.email || "Anonymous"}
                            </p>
                            {gift.personalMessage && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                &ldquo;{gift.personalMessage}&rdquo;
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{gift.months} months</TableCell>
                        <TableCell>{getStatusBadge(gift)}</TableCell>
                        <TableCell>
                          {gift.redeemedAt
                            ? formatDate(gift.redeemedAt)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GiftsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      }
    >
      <GiftsContent />
    </Suspense>
  );
}
