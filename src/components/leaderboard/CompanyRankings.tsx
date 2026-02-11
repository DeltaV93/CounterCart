"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyOffset {
  merchantName: string;
  totalOffset: number;
  donationCount: number;
}

interface CompanyRankingsProps {
  companies: CompanyOffset[];
  className?: string;
}

export function CompanyRankings({ companies, className }: CompanyRankingsProps) {
  if (companies.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No company data available yet. Start offsetting to see rankings!
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxOffset = companies[0]?.totalOffset || 1;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Most Offset Companies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {companies.map((company, index) => {
            const percentage = (company.totalOffset / maxOffset) * 100;
            const isTop3 = index < 3;

            return (
              <div key={company.merchantName} className="relative">
                {/* Rank badge */}
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center headline text-lg",
                      isTop3
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Company name and stats */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">
                        {company.merchantName}
                      </span>
                      <span className="headline text-lg ml-2">
                        ${company.totalOffset.toFixed(2)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          isTop3 ? "bg-accent" : "bg-primary"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Donation count */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {company.donationCount.toLocaleString()} donation
                      {company.donationCount !== 1 ? "s" : ""}
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
