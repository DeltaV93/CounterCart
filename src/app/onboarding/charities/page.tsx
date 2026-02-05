"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Badge import available if needed in the future
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Leaf,
  Shield,
  Users,
  ShieldAlert,
  Briefcase,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";
import { CharityCard, CharityCardSkeleton } from "@/components/CharityCard";
import type { CharitiesByCause } from "@/app/api/charities/route";

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
  const router = useRouter();
  const [data, setData] = useState<CharitiesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        // Fetch charities for user's selected causes with Every.org enrichment
        const response = await fetch(
          "/api/charities?userCausesOnly=true&enrich=true"
        );
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching charities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharities();
  }, []);

  const handleContinue = async () => {
    setIsSaving(true);
    // Track charities selection completed
    track(AnalyticsEvents.ONBOARDING_CHARITIES_SELECTED);
    // For now, just proceed - charity selections are saved individually for premium users
    router.push("/onboarding/connect");
  };

  const handleBack = () => {
    router.push("/onboarding/causes");
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your supported charities</CardTitle>
          <CardDescription>Loading charities...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="grid gap-3">
                {[...Array(2)].map((_, j) => (
                  <CharityCardSkeleton key={j} />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.charities.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">No causes selected</CardTitle>
          <CardDescription>
            Please go back and select at least one cause to see available
            charities.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={handleBack} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Causes
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Your supported charities</CardTitle>
        <CardDescription>
          These are the nonprofits that will receive your donations. Each cause
          has a default charity selected.
          {!data.isPremium && (
            <span className="block mt-2 text-primary">
              <Sparkles className="inline h-4 w-4 mr-1" />
              Upgrade to Premium to choose your own charities
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {data.charities.map((causeGroup) => {
          const Icon =
            iconMap[causeGroup.cause.iconName || "Heart"] || Heart;

          return (
            <div key={causeGroup.cause.id}>
              {/* Cause Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    causeGroup.cause.color || "bg-gray-500"
                  } text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{causeGroup.cause.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {causeGroup.charities.length} nonprofit
                    {causeGroup.charities.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              {/* Charities List */}
              <div className="grid gap-3 ml-13">
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
                    isPremium={data.isPremium}
                    selectable={false} // Read-only in onboarding
                  />
                ))}
              </div>

              <Separator className="mt-6" />
            </div>
          );
        })}

        {/* Premium Upsell */}
        {!data.isPremium && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Want to choose your charities?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upgrade to Premium to select which nonprofit receives your
                    donations for each cause.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/upgrade")}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Learn about Premium
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
