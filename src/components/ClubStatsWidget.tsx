"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  ArrowRight,
  Heart,
  Leaf,
  Shield,
  ShieldAlert,
  Briefcase,
  TrendingUp,
} from "lucide-react";

interface ClubMembership {
  id: string;
  clubId: string;
  inviteCode: string;
  contributed: number;
  inviteCount: number;
  role: string;
  joinedAt: string;
  club: {
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    totalDonated: number;
    cause: {
      id: string;
      name: string;
      slug: string;
      iconName: string | null;
      color: string | null;
    };
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  Leaf,
  Shield,
  Users,
  ShieldAlert,
  Briefcase,
};

export function ClubStatsWidget() {
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await fetch("/api/user/clubs");
        if (response.ok) {
          const data = await response.json();
          setMemberships(data.memberships || []);
        }
      } catch (error) {
        console.error("Error fetching club memberships:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberships();
  }, []);

  if (isLoading) {
    return <ClubStatsWidgetSkeleton />;
  }

  // No memberships - show call to action
  if (memberships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cause Clubs
          </CardTitle>
          <CardDescription>
            Join a community of like-minded givers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect with others who share your values and track your collective impact
            </p>
            <Link href="/clubs">
              <Button size="sm">
                Browse Clubs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalContributed = memberships.reduce(
    (sum, m) => sum + m.contributed,
    0
  );
  const totalInvites = memberships.reduce((sum, m) => sum + m.inviteCount, 0);
  const topClub = memberships.reduce((best, m) =>
    m.contributed > (best?.contributed || 0) ? m : best
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Clubs
          </CardTitle>
          <CardDescription>
            {memberships.length} club{memberships.length !== 1 ? "s" : ""} joined
          </CardDescription>
        </div>
        <Link href="/clubs">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50">
              <div className="text-2xl font-bold tabular-nums">
                ${totalContributed.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Your Impact</div>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <div className="text-2xl font-bold tabular-nums">
                {totalInvites}
              </div>
              <div className="text-xs text-muted-foreground">Friends Invited</div>
            </div>
          </div>

          {/* Top Club */}
          {topClub && (
            <Link
              href={`/club/${topClub.club.slug}`}
              className="block border-2 border-primary/20 p-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon =
                      iconMap[topClub.club.cause.iconName || "Heart"] || Heart;
                    return (
                      <div
                        className={`flex h-8 w-8 items-center justify-center ${
                          topClub.club.cause.color || "bg-primary"
                        } text-white`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="font-medium text-sm">{topClub.club.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {topClub.club.memberCount} members
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <TrendingUp className="h-3 w-3" />
                    ${topClub.club.totalDonated.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">raised</div>
                </div>
              </div>
            </Link>
          )}

          {/* Other clubs preview */}
          {memberships.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {memberships
                .filter((m) => m.id !== topClub?.id)
                .slice(0, 3)
                .map((membership) => {
                  const Icon =
                    iconMap[membership.club.cause.iconName || "Heart"] || Heart;
                  return (
                    <Link
                      key={membership.id}
                      href={`/club/${membership.club.slug}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 border border-primary/20 text-xs hover:border-primary/40 transition-colors"
                    >
                      <Icon className="h-3 w-3" />
                      {membership.club.cause.name}
                    </Link>
                  );
                })}
              {memberships.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                  +{memberships.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ClubStatsWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-16" />
        </div>
      </CardContent>
    </Card>
  );
}
