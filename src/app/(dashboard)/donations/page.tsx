"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
import { Gift, ExternalLink, CheckCircle } from "lucide-react";

interface Donation {
  id: string;
  charitySlug: string;
  charityName: string;
  charityLogoUrl?: string | null;
  amount: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

// Simple cache for charity logos
const charityLogoCache = new Map<string, string | null>();

async function fetchCharityLogo(slug: string): Promise<string | null> {
  if (charityLogoCache.has(slug)) {
    return charityLogoCache.get(slug) || null;
  }

  try {
    const response = await fetch(
      `https://partners.every.org/v0.2/nonprofit/${encodeURIComponent(slug)}`
    );
    if (response.ok) {
      const data = await response.json();
      const logoUrl = data.nonprofit?.logoUrl || null;
      charityLogoCache.set(slug, logoUrl);
      return logoUrl;
    }
  } catch (error) {
    console.error(`Error fetching logo for ${slug}:`, error);
  }

  charityLogoCache.set(slug, null);
  return null;
}

function CharityLogo({
  slug,
  name,
  size = 48,
}: {
  slug: string;
  name: string;
  size?: number;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    charityLogoCache.get(slug) || null
  );
  const [loading, setLoading] = useState(!charityLogoCache.has(slug));

  useEffect(() => {
    if (!charityLogoCache.has(slug)) {
      fetchCharityLogo(slug).then((url) => {
        setLogoUrl(url);
        setLoading(false);
      });
    }
  }, [slug]);

  if (loading) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  if (logoUrl) {
    return (
      <div
        className="relative rounded-full overflow-hidden bg-muted flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={logoUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium"
      style={{ width: size, height: size }}
    >
      {name.charAt(0)}
    </div>
  );
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const response = await fetch("/api/donations");
        if (response.ok) {
          const data = await response.json();
          setDonations(data);
        }
      } catch (error) {
        console.error("Error fetching donations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const pendingDonations = donations.filter((d) => d.status === "PENDING");
  const completedDonations = donations.filter((d) => d.status === "COMPLETED");
  const totalPending = pendingDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalCompleted = completedDonations.reduce((sum, d) => sum + d.amount, 0);

  const handleDonate = (charitySlug: string, amount: number, donationId: string) => {
    // Generate Every.org donate URL
    const params = new URLSearchParams({
      amount: amount.toFixed(2),
      frequency: "ONCE",
      success_url: `${window.location.origin}/donations?completed=${donationId}`,
    });

    const donateUrl = `https://www.every.org/${charitySlug}#donate?${params.toString()}`;
    window.open(donateUrl, "_blank");
  };

  const handleDonateAll = () => {
    // Group by charity and donate to each
    const byCharity = pendingDonations.reduce((acc, d) => {
      if (!acc[d.charitySlug]) {
        acc[d.charitySlug] = { name: d.charityName, total: 0, ids: [] };
      }
      acc[d.charitySlug].total += d.amount;
      acc[d.charitySlug].ids.push(d.id);
      return acc;
    }, {} as Record<string, { name: string; total: number; ids: string[] }>);

    // Open first charity (for MVP, we'll do one at a time)
    const firstCharity = Object.entries(byCharity)[0];
    if (firstCharity) {
      handleDonate(firstCharity[0], firstCharity[1].total, firstCharity[1].ids.join(","));
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donations</h1>
          <p className="text-muted-foreground">
            Manage and complete your pending donations
          </p>
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Donations</h1>
        <p className="text-muted-foreground">
          Manage and complete your pending donations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {pendingDonations.length} donation{pendingDonations.length !== 1 ? "s" : ""} ready
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCompleted.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {completedDonations.length} donation{completedDonations.length !== 1 ? "s" : ""} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Donations */}
      {pendingDonations.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Donations</CardTitle>
                <CardDescription>
                  Complete these donations to support your causes
                </CardDescription>
              </div>
              <Button onClick={handleDonateAll}>
                <Gift className="mr-2 h-4 w-4" />
                Donate All (${totalPending.toFixed(2)})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <CharityLogo
                      slug={donation.charitySlug}
                      name={donation.charityName}
                      size={48}
                    />
                    <div>
                      <a
                        href={`https://www.every.org/${donation.charitySlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {donation.charityName}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {new Date(donation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">${donation.amount.toFixed(2)}</span>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleDonate(donation.charitySlug, donation.amount, donation.id)
                      }
                    >
                      Donate
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Donations */}
      <Card>
        <CardHeader>
          <CardTitle>Donation History</CardTitle>
          <CardDescription>Your completed donations</CardDescription>
        </CardHeader>
        <CardContent>
          {completedDonations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">No donations yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Completed donations will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <CharityLogo
                        slug={donation.charitySlug}
                        name={donation.charityName}
                        size={48}
                      />
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <a
                        href={`https://www.every.org/${donation.charitySlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {donation.charityName}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {donation.completedAt
                          ? new Date(donation.completedAt).toLocaleDateString()
                          : new Date(donation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">${donation.amount.toFixed(2)}</span>
                    <Badge className={statusColors[donation.status] + " ml-2"}>
                      {donation.status.toLowerCase()}
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
