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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Leaf,
  Shield,
  Users,
  ShieldAlert,
  Briefcase,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface Cause {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  color: string | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  Leaf,
  Shield,
  Users,
  ShieldAlert,
  Briefcase,
};

export default function CausesPage() {
  const router = useRouter();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCauses = async () => {
      try {
        const response = await fetch("/api/causes");
        if (response.ok) {
          const data = await response.json();
          setCauses(data);
        }
      } catch (error) {
        console.error("Error fetching causes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCauses();
  }, []);

  const toggleCause = (causeId: string) => {
    setSelectedCauses((prev) =>
      prev.includes(causeId)
        ? prev.filter((id) => id !== causeId)
        : [...prev, causeId]
    );
  };

  const handleContinue = async () => {
    if (selectedCauses.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/causes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ causeIds: selectedCauses }),
      });

      if (response.ok) {
        track(AnalyticsEvents.ONBOARDING_CAUSES_SELECTED);
        router.push("/onboarding/charities");
      }
    } catch (error) {
      console.error("Error saving causes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose your causes</CardTitle>
        <CardDescription>
          Select the causes you care about. When you shop at businesses with conflicting
          values, we&apos;ll suggest donations to charities supporting these causes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {causes.map((cause) => {
          const Icon = iconMap[cause.iconName || "Heart"] || Heart;
          const isSelected = selectedCauses.includes(cause.id);

          return (
            <div
              key={cause.id}
              className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/50 hover:bg-muted"
              }`}
              onClick={() => toggleCause(cause.id)}
            >
              <Checkbox
                checked={isSelected}
                className="mt-1"
                onCheckedChange={() => toggleCause(cause.id)}
              />
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  cause.color || "bg-gray-500"
                } text-white shrink-0`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{cause.name}</h3>
                  {isSelected && (
                    <Badge variant="secondary" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {cause.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          {selectedCauses.length === 0
            ? "Select at least one cause to continue"
            : `${selectedCauses.length} cause${selectedCauses.length > 1 ? "s" : ""} selected`}
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={handleContinue}
          disabled={selectedCauses.length === 0 || isSaving}
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
