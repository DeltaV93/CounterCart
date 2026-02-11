"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Copy,
  Check,
  LogOut,
  Share2,
  TrendingUp,
} from "lucide-react";

interface ClubData {
  club: {
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
  };
  members: Array<{
    id: string;
    userId: string;
    name: string | null;
    contributed: number;
    role: string;
    inviteCount: number;
    joinedAt: string;
  }>;
  userMembership: {
    id: string;
    inviteCode: string;
    contributed: number;
    inviteCount: number;
    role: string;
  } | null;
}

export default function ClubPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [data, setData] = useState<ClubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const response = await fetch(`/api/clubs/${slug}`);
        if (response.ok) {
          const clubData = await response.json();
          setData(clubData);
          track(AnalyticsEvents.CLUB_VIEWED);
        } else if (response.status === 404) {
          toast.error("Club not found");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching club:", error);
        toast.error("Failed to load club");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClub();
  }, [slug, router]);

  const handleJoin = async () => {
    if (!data) return;
    setIsJoining(true);

    try {
      const response = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: data.club.id }),
      });

      if (response.ok) {
        toast.success(`Welcome to ${data.club.name}!`);
        track(AnalyticsEvents.CLUB_JOINED);
        // Refresh data
        const refreshResponse = await fetch(`/api/clubs/${slug}`);
        if (refreshResponse.ok) {
          setData(await refreshResponse.json());
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to join club");
      }
    } catch {
      toast.error("Failed to join club");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!data) return;
    setIsLeaving(true);

    try {
      const response = await fetch(`/api/clubs/${slug}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("You have left the club");
        // Refresh data
        const refreshResponse = await fetch(`/api/clubs/${slug}`);
        if (refreshResponse.ok) {
          setData(await refreshResponse.json());
        }
      } else {
        toast.error("Failed to leave club");
      }
    } catch {
      toast.error("Failed to leave club");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!data?.userMembership) return;

    const inviteUrl = `${window.location.origin}/join/${data.club.cause.slug}/${data.userMembership.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      track(AnalyticsEvents.CLUB_INVITE_SENT);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { club, members, userMembership } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
            {userMembership && (
              <Badge variant="secondary">{userMembership.role}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {club.description || `Supporting ${club.cause.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {userMembership ? (
            <>
              <Button variant="outline" onClick={handleCopyInvite}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Invite Friends
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleLeave}
                disabled={isLeaving}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLeaving ? "Leaving..." : "Leave"}
              </Button>
            </>
          ) : (
            <Button onClick={handleJoin} disabled={isJoining}>
              <Users className="mr-2 h-4 w-4" />
              {isJoining ? "Joining..." : "Join Club"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{club.memberCount}</div>
            <p className="text-xs text-muted-foreground">
              {userMembership
                ? `You've invited ${userMembership.inviteCount}`
                : "Join to invite friends"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Donated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${club.totalDonated.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              For {club.cause.name}
            </p>
          </CardContent>
        </Card>

        {userMembership && (
          <Card variant="accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Your Contribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${userMembership.contributed.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Rank #{members.findIndex((m) => m.id === userMembership.id) + 1}{" "}
                of {club.memberCount}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Leaderboard
          </CardTitle>
          <CardDescription>Top contributors in this club</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3 border ${
                  userMembership?.id === member.id
                    ? "border-accent bg-accent/5"
                    : "border-primary/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center font-display text-sm ${
                      index === 0
                        ? "bg-accent text-accent-foreground"
                        : index === 1
                        ? "bg-primary/20 text-primary"
                        : index === 2
                        ? "bg-highlight/20 text-highlight-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.name || "Anonymous"}
                      {userMembership?.id === member.id && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (You)
                        </span>
                      )}
                    </div>
                    {member.inviteCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {member.inviteCount} invited
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">
                    ${member.contributed.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.role}
                  </div>
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No members yet. Be the first to join!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite CTA for members */}
      {userMembership && (
        <Card variant="highlight">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg uppercase tracking-wider">
                  Grow the Movement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Invite friends to join {club.name} and increase our collective
                  impact
                </p>
              </div>
              <Button variant="default" onClick={handleCopyInvite}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Invite Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
