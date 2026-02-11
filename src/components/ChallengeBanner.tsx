"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Users,
  Clock,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { track, AnalyticsEvents } from "@/lib/analytics";

interface FeaturedChallenge {
  id: string;
  slug: string;
  title: string;
  shortDesc: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  participantCount: number;
  progress: number;
  daysRemaining: number;
  status: string;
  cause?: {
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  isParticipating?: boolean;
}

export function ChallengeBanner() {
  const [challenge, setChallenge] = useState<FeaturedChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchFeaturedChallenge = async () => {
      try {
        const response = await fetch("/api/challenges?featured=true");
        if (response.ok) {
          const data = await response.json();
          if (data.challenge) {
            // Fetch full details to get participation status
            const detailsResponse = await fetch(
              `/api/challenges/${data.challenge.slug}`
            );
            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              setChallenge({
                ...details.challenge,
                isParticipating: details.userParticipation !== null,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching featured challenge:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedChallenge();
  }, []);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!challenge || isJoining) return;

    setIsJoining(true);
    try {
      const response = await fetch(`/api/challenges/${challenge.slug}/join`, {
        method: "POST",
      });

      if (response.ok) {
        setChallenge((prev) =>
          prev
            ? {
                ...prev,
                isParticipating: true,
                participantCount: prev.participantCount + 1,
              }
            : null
        );
        track(AnalyticsEvents.CHALLENGE_JOINED);
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return <ChallengeBannerSkeleton />;
  }

  if (!challenge) {
    return null;
  }

  const isCompleted = challenge.status === "completed";

  return (
    <Link href={`/challenge/${challenge.slug}`}>
      <Card variant="highlight" hover className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left side - Challenge info */}
            <div className="flex-1 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-accent" />
                <Badge variant="accent" className="font-display">
                  Featured Challenge
                </Badge>
                {challenge.cause && (
                  <Badge variant="outline">{challenge.cause.name}</Badge>
                )}
              </div>

              <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wider mb-2">
                {challenge.title}
              </h2>
              <p className="text-muted-foreground mb-4 line-clamp-2">
                {challenge.shortDesc}
              </p>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-mono">
                    ${challenge.currentAmount.toLocaleString()} raised
                  </span>
                  <span className="font-display uppercase tracking-wider">
                    {challenge.progress.toFixed(0)}% of $
                    {challenge.goalAmount.toLocaleString()}
                  </span>
                </div>
                <Progress value={challenge.progress} className="h-4" />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {challenge.participantCount} participants
                </span>
                {!isCompleted && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {challenge.daysRemaining} days left
                  </span>
                )}
                {isCompleted && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-accent" />
                    Challenge completed!
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {challenge.isParticipating ? (
                  <Badge variant="secondary" className="h-10 px-4">
                    <Check className="h-4 w-4 mr-2" />
                    You&apos;re In!
                  </Badge>
                ) : !isCompleted ? (
                  <Button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="font-display"
                  >
                    {isJoining ? "Joining..." : "Join Challenge"}
                  </Button>
                ) : null}
                <Button variant="ghost" className="font-display">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Right side - Visual element */}
            <div className="hidden md:flex items-center justify-center w-64 bg-accent/10 border-l-2 border-primary">
              <div className="text-center p-6">
                <Trophy className="h-16 w-16 text-accent mx-auto mb-4" />
                <div className="font-display text-4xl uppercase tracking-wider">
                  {challenge.progress.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground font-mono mt-1">
                  of goal reached
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ChallengeBannerSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
