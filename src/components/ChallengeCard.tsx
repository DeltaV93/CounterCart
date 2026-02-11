"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, Target, ArrowRight, Check } from "lucide-react";

export interface ChallengeCardProps {
  slug: string;
  title: string;
  shortDesc: string;
  goalAmount: number;
  currentAmount: number;
  participantCount: number;
  daysRemaining: number;
  progress: number;
  status: string;
  imageUrl?: string | null;
  cause?: {
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  isParticipating?: boolean;
  featured?: boolean;
  compact?: boolean;
}

export function ChallengeCard({
  slug,
  title,
  shortDesc,
  goalAmount,
  currentAmount,
  participantCount,
  daysRemaining,
  progress,
  status,
  cause,
  isParticipating = false,
  featured = false,
  compact = false,
}: ChallengeCardProps) {
  const isCompleted = status === "completed";
  const isUpcoming = status === "upcoming";

  if (compact) {
    return (
      <Link href={`/challenge/${slug}`}>
        <Card
          hover
          className={`${
            featured ? "border-accent" : ""
          } transition-all`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display text-sm uppercase tracking-wider truncate">
                    {title}
                  </h3>
                  {isParticipating && (
                    <Badge variant="accent" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Joined
                    </Badge>
                  )}
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-mono">
                  <span>${currentAmount.toFixed(0)} / ${goalAmount.toFixed(0)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {daysRemaining}d left
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/challenge/${slug}`}>
      <Card
        hover
        variant={featured ? "accent" : "default"}
        className={`h-full ${featured ? "border-accent" : ""}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              {cause && (
                <Badge variant="outline" className="mb-2">
                  {cause.name}
                </Badge>
              )}
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{shortDesc}</CardDescription>
            </div>
            {isCompleted && (
              <Badge variant="secondary">
                <Trophy className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {isUpcoming && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Upcoming
              </Badge>
            )}
            {isParticipating && !isCompleted && (
              <Badge variant="accent">
                <Check className="h-3 w-3 mr-1" />
                Joined
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-mono text-muted-foreground">
                ${currentAmount.toLocaleString()} raised
              </span>
              <span className="font-display uppercase tracking-wider text-xs">
                {progress.toFixed(0)}%
              </span>
            </div>
            <Progress value={progress} />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                ${goalAmount.toLocaleString()} goal
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-primary/10">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {participantCount}
              </span>
              {!isCompleted && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {daysRemaining}d
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7">
              View
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ChallengeCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
        <div className="animate-pulse flex justify-between pt-2">
          <div className="h-4 bg-muted rounded w-16" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      </CardContent>
    </Card>
  );
}
