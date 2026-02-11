"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CauseFunding {
  causeId: string;
  causeName: string;
  causeSlug: string;
  totalFunded: number;
  donationCount: number;
}

interface CauseRankingsProps {
  causes: CauseFunding[];
  className?: string;
}

// Cause colors based on slug
const CAUSE_COLORS: Record<string, string> = {
  lgbtq: "bg-pink-500",
  climate: "bg-green-500",
  reproductive: "bg-purple-500",
  "racial-justice": "bg-orange-500",
  "gun-safety": "bg-red-500",
  "workers-rights": "bg-blue-500",
};

export function CauseRankings({ causes, className }: CauseRankingsProps) {
  if (causes.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-12 text-center">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No cause data available yet. Start donating to see rankings!
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxFunded = causes[0]?.totalFunded || 1;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Top Causes Funded
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {causes.map((cause, index) => {
            const percentage = (cause.totalFunded / maxFunded) * 100;
            const isTop3 = index < 3;
            const barColor = CAUSE_COLORS[cause.causeSlug] || "bg-primary";

            return (
              <div key={cause.causeId} className="relative">
                {/* Rank badge */}
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center headline text-lg",
                      isTop3
                        ? "bg-highlight text-highlight-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Cause name and stats */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">
                        {cause.causeName}
                      </span>
                      <span className="headline text-lg ml-2">
                        ${cause.totalFunded.toFixed(2)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          barColor
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Donation count */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {cause.donationCount.toLocaleString()} donation
                      {cause.donationCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
