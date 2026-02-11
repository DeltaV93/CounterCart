"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
import {
  Users,
  Trophy,
  Check,
  ArrowRight,
  Share2,
  TrendingUp,
  Heart,
  Leaf,
  Shield,
  ShieldAlert,
  Briefcase,
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

interface AllClub {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  totalDonated: number;
  rank: number | null;
  cause: {
    id: string;
    name: string;
    slug: string;
    iconName: string | null;
    color: string | null;
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

export default function ClubsPage() {
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [allClubs, setAllClubs] = useState<AllClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membershipsRes, clubsRes] = await Promise.all([
          fetch("/api/user/clubs"),
          fetch("/api/clubs"),
        ]);

        if (membershipsRes.ok) {
          const data = await membershipsRes.json();
          setMemberships(data.memberships || []);
        }

        if (clubsRes.ok) {
          const data = await clubsRes.json();
          setAllClubs(data.clubs || []);
        }
      } catch (error) {
        console.error("Error fetching clubs:", error);
        toast.error("Failed to load clubs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCopyInvite = async (membership: ClubMembership) => {
    const inviteUrl = `${window.location.origin}/join/${membership.club.cause.slug}/${membership.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedCode(membership.inviteCode);
      toast.success("Invite link copied!");
      track(AnalyticsEvents.CLUB_INVITE_SENT);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Get clubs user hasn't joined yet
  const joinedClubIds = new Set(memberships.map((m) => m.clubId));
  const availableClubs = allClubs.filter((club) => !joinedClubIds.has(club.id));

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cause Clubs</h1>
        <p className="text-muted-foreground">
          Join communities of like-minded givers and track your collective impact
        </p>
      </div>

      {/* My Clubs */}
      <div className="space-y-4">
        <h2 className="font-display text-xl uppercase tracking-wider">
          Your Clubs
        </h2>

        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No clubs yet</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Join a cause club to connect with other donors and track your collective impact
              </p>
              {availableClubs.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Browse available clubs below to get started
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership) => {
              const Icon =
                iconMap[membership.club.cause.iconName || "Heart"] || Heart;
              const isCopied = copiedCode === membership.inviteCode;

              return (
                <Card key={membership.id} hover>
                  <Link href={`/club/${membership.club.slug}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center ${
                              membership.club.cause.color || "bg-primary"
                            } text-white`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {membership.club.name}
                            </CardTitle>
                            <CardDescription>
                              {membership.club.cause.name}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary">{membership.role}</Badge>
                      </div>
                    </CardHeader>
                  </Link>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold tabular-nums">
                            {membership.club.memberCount}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Members
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold tabular-nums">
                            ${membership.club.totalDonated.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Raised
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold tabular-nums">
                            ${membership.contributed.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Your Total
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCopyInvite(membership);
                          }}
                        >
                          {isCopied ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Share2 className="mr-2 h-4 w-4" />
                              Invite
                            </>
                          )}
                        </Button>
                        <Link href={`/club/${membership.club.slug}`}>
                          <Button size="sm" variant="default">
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      {/* Invite stats */}
                      {membership.inviteCount > 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                          You&apos;ve invited {membership.inviteCount} member
                          {membership.inviteCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Discover More Clubs */}
      {availableClubs.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl uppercase tracking-wider">
            Discover Clubs
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableClubs.map((club) => {
              const Icon = iconMap[club.cause.iconName || "Heart"] || Heart;

              return (
                <Card key={club.id} hover>
                  <Link href={`/club/${club.slug}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center ${
                            club.cause.color || "bg-primary"
                          } text-white`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{club.name}</CardTitle>
                          <CardDescription>
                            {club.cause.name}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {club.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {club.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{club.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>${club.totalDonated.toFixed(0)} raised</span>
                          </div>
                        </div>

                        <Button size="sm" className="w-full">
                          <Users className="mr-2 h-4 w-4" />
                          Join Club
                        </Button>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Leaderboard CTA */}
      <Card variant="highlight">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Trophy className="h-10 w-10 text-accent" />
              <div>
                <h3 className="font-display text-lg uppercase tracking-wider">
                  Club Leaderboard
                </h3>
                <p className="text-sm text-muted-foreground">
                  See how your clubs rank against others in total impact
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {memberships.length > 0 && (
                <Link href={`/club/${memberships[0].club.slug}`}>
                  <Button variant="outline">
                    View My Top Club
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
