"use client";

import { useState, useEffect, useCallback } from "react";
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
  Heart,
  Leaf,
  Shield,
  Users,
  ShieldAlert,
  Briefcase,
  Sparkles,
  Lock,
  RefreshCw,
} from "lucide-react";
import { CharityCard, CharityCardSkeleton } from "@/components/CharityCard";
import type { CharitiesByCause } from "@/app/api/charities/route";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  Leaf,
  Shield,
  Users,
  ShieldAlert,
  Briefcase,
};

interface CharitiesResponse {
  charities: CharitiesByCause[];
  isPremium: boolean;
}

export default function CharitiesPage() {
  const [data, setData] = useState<CharitiesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const fetchCharities = useCallback(async () => {
    try {
      // Fetch all charities grouped by cause with Every.org enrichment
      const params = new URLSearchParams({
        enrich: "true",
      });

      if (activeTab !== "all") {
        params.set("causeSlug", activeTab);
      }

      const response = await fetch(`/api/charities?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching charities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCharities();
  }, [fetchCharities]);

  const handleSelectCharity = async (causeId: string, charityId: string) => {
    if (!data?.isPremium) {
      toast.error("Upgrade to Premium to choose your charities");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch("/api/charities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ causeId, charityId }),
      });

      if (response.ok) {
        toast.success("Charity preference updated!");
        // Refresh the data
        await fetchCharities();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update preference");
      }
    } catch (error) {
      console.error("Error updating charity preference:", error);
      toast.error("Failed to update preference");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charities</h1>
          <p className="text-muted-foreground">
            Browse and manage your charity preferences
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="grid gap-3">
                    {[...Array(2)].map((_, j) => (
                      <CharityCardSkeleton key={j} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allCauses = data?.charities || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charities</h1>
          <p className="text-muted-foreground">
            Browse and manage your charity preferences
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCharities}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Premium Status Banner */}
      {!data?.isPremium && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Want to choose your charities?</p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Premium to select your preferred charity for each cause
                  </p>
                </div>
              </div>
              <Button variant="default" size="sm" asChild>
                <a href="/upgrade">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cause Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-sm">
            All Causes
          </TabsTrigger>
          {allCauses.map((causeGroup) => {
            const Icon =
              iconMap[causeGroup.cause.iconName || "Heart"] || Heart;
            return (
              <TabsTrigger
                key={causeGroup.cause.slug}
                value={causeGroup.cause.slug}
                className="text-sm"
              >
                <Icon className="h-4 w-4 mr-1" />
                {causeGroup.cause.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {allCauses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No charities found</h3>
                <p className="text-muted-foreground mt-1">
                  No charities available for the selected filter
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {allCauses
                .filter(
                  (causeGroup) =>
                    activeTab === "all" ||
                    causeGroup.cause.slug === activeTab
                )
                .map((causeGroup) => {
                  const Icon =
                    iconMap[causeGroup.cause.iconName || "Heart"] || Heart;

                  return (
                    <Card key={causeGroup.cause.id}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              causeGroup.cause.color || "bg-gray-500"
                            } text-white`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">
                              {causeGroup.cause.name}
                            </CardTitle>
                            <CardDescription>
                              {causeGroup.cause.description}
                            </CardDescription>
                          </div>
                        </div>
                        {causeGroup.selectedCharityId && (
                          <Badge variant="secondary" className="w-fit mt-2">
                            Custom selection active
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          {causeGroup.charities.map((charity) => (
                            <CharityCard
                              key={charity.id}
                              id={charity.id}
                              name={charity.name}
                              description={charity.description}
                              logoUrl={charity.logoUrl}
                              everyOrgSlug={charity.everyOrgSlug}
                              websiteUrl={charity.websiteUrl}
                              isDefault={charity.isDefault}
                              isSelected={charity.isSelected}
                              isPremium={data?.isPremium || false}
                              selectable={true}
                              onSelect={(charityId) =>
                                handleSelectCharity(
                                  causeGroup.cause.id,
                                  charityId
                                )
                              }
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
