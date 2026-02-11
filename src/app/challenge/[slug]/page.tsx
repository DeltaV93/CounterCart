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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Trophy,
  Clock,
  Target,
  Share2,
  LogOut,
  Check,
  Medal,
  Calendar,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface ChallengeData {
  challenge: {
    id: string;
    slug: string;
    title: string;
    description: string;
    shortDesc: string;
    goalAmount: number;
    currentAmount: number;
    participantCount: number;
    startDate: string;
    endDate: string;
    status: string;
    imageUrl: string | null;
    badgeId: string | null;
    featured: boolean;
    progress: number;
    daysRemaining: number;
    daysUntilStart: number;
    isActive: boolean;
    isUpcoming: boolean;
    isCompleted: boolean;
    cause: {
      id: string;
      name: string;
      slug: string;
      iconName: string | null;
      color: string | null;
    } | null;
  };
  participants: Array<{
    id: string;
    userId: string;
    userName: string | null;
    contributed: number;
    joinedAt: string;
    earnedBadge: boolean;
  }>;
  userParticipation: {
    isParticipant: boolean;
    contributed: number;
    rank: number | null;
    earnedBadge: boolean;
  } | null;
}

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [data, setData] = useState<ChallengeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const response = await fetch(`/api/challenges/${slug}`);
        if (response.ok) {
          const challengeData = await response.json();
          setData(challengeData);
          track(AnalyticsEvents.CHALLENGE_VIEWED);
        } else if (response.status === 404) {
          toast.error("Challenge not found");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching challenge:", error);
        toast.error("Failed to load challenge");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [slug, router]);

  const handleJoin = async () => {
    if (!data) return;
    setIsJoining(true);

    try {
      const response = await fetch(`/api/challenges/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success(`You've joined ${data.challenge.title}!`);
        track(AnalyticsEvents.CHALLENGE_JOINED);
        // Refresh data
        const refreshResponse = await fetch(`/api/challenges/${slug}`);
        if (refreshResponse.ok) {
          setData(await refreshResponse.json());
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to join challenge");
      }
    } catch {
      toast.error("Failed to join challenge");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!data) return;
    setIsLeaving(true);

    try {
      const response = await fetch(`/api/challenges/${slug}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("You have left the challenge");
        // Refresh data
        const refreshResponse = await fetch(`/api/challenges/${slug}`);
        if (refreshResponse.ok) {
          setData(await refreshResponse.json());
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to leave challenge");
      }
    } catch {
      toast.error("Failed to leave challenge");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/challenge/${slug}`;
    const shareText = data
      ? `Join me in the "${data.challenge.title}" challenge on CounterCart! Help us reach our $${data.challenge.goalAmount.toLocaleString()} goal.`
      : "Join this challenge on CounterCart!";

    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.challenge.title || "Challenge",
          text: shareText,
          url: shareUrl,
        });
        track(AnalyticsEvents.CHALLENGE_SHARED);
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Challenge link copied!");
        track(AnalyticsEvents.CHALLENGE_SHARED);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48" />
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

  const { challenge, participants, userParticipation } = data;
  const isParticipating = userParticipation?.isParticipant || false;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {challenge.cause && (
              <Badge variant="outline">{challenge.cause.name}</Badge>
            )}
            {challenge.isActive && (
              <Badge variant="accent">
                <Sparkles className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            {challenge.isUpcoming && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Upcoming
              </Badge>
            )}
            {challenge.isCompleted && (
              <Badge variant="dark">
                <Trophy className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-wider">
            {challenge.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {challenge.description}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleShare}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </>
            )}
          </Button>
          {isParticipating && !challenge.isCompleted && (
            <Button
              variant="ghost"
              onClick={handleLeave}
              disabled={isLeaving || userParticipation?.earnedBadge}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLeaving ? "Leaving..." : "Leave"}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <Card variant="highlight">
        <CardContent className="p-6 md:p-8">
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-lg">
                  ${challenge.currentAmount.toLocaleString()}
                </span>
                <span className="font-display text-lg uppercase tracking-wider">
                  {challenge.progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={challenge.progress} className="h-6" />
              <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Target className="h-4 w-4" />$
                  {challenge.goalAmount.toLocaleString()} goal
                </span>
                {challenge.isActive && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {challenge.daysRemaining} days remaining
                  </span>
                )}
                {challenge.isUpcoming && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Starts in {challenge.daysUntilStart} days
                  </span>
                )}
              </div>
            </div>

            {/* Join CTA */}
            {!isParticipating && !challenge.isCompleted && (
              <div className="pt-4 border-t-2 border-primary/20">
                <Button
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={handleJoin}
                  disabled={isJoining}
                >
                  <Users className="mr-2 h-5 w-5" />
                  {isJoining ? "Joining..." : "Join This Challenge"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {challenge.participantCount}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {isParticipating
                ? "You're part of this challenge!"
                : "Join to be counted"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {challenge.isActive
                ? `${challenge.daysRemaining}d`
                : challenge.isUpcoming
                ? `${challenge.daysUntilStart}d`
                : "Ended"}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {challenge.isActive
                ? "remaining"
                : challenge.isUpcoming
                ? "until start"
                : new Date(challenge.endDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {isParticipating && userParticipation && (
          <Card variant="accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Your Contribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">
                ${userParticipation.contributed.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {userParticipation.rank
                  ? `Rank #${userParticipation.rank}`
                  : "Keep donating to rank!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Badge info */}
      {challenge.badgeId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-accent" />
              Earn a Badge
            </CardTitle>
            <CardDescription>
              All participants will earn a special badge when this challenge
              completes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-accent/10 border-2 border-primary">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h4 className="font-display uppercase tracking-wider">
                  Challenge Badge
                </h4>
                <p className="text-sm text-muted-foreground">
                  {userParticipation?.earnedBadge
                    ? "You've earned this badge!"
                    : "Join and contribute to earn this badge"}
                </p>
              </div>
              {userParticipation?.earnedBadge && (
                <Badge variant="accent" className="ml-auto">
                  <Check className="h-3 w-3 mr-1" />
                  Earned
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Leaderboard
          </CardTitle>
          <CardDescription>Top contributors to this challenge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 border-2 ${
                  userParticipation && participant.userId === userParticipation.rank?.toString()
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
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {participant.userName
                        ? participant.userName.charAt(0).toUpperCase()
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {participant.userName || "Anonymous"}
                    </div>
                    {participant.earnedBadge && (
                      <div className="flex items-center gap-1 text-xs text-accent">
                        <Medal className="h-3 w-3" />
                        Badge earned
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono tabular-nums">
                    ${participant.contributed.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {new Date(participant.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {participants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No participants yet. Be the first to join!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Share CTA */}
      <Card variant="accent">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg uppercase tracking-wider">
                Spread the Word
              </h3>
              <p className="text-sm text-muted-foreground">
                Share this challenge and help us reach our goal faster
              </p>
            </div>
            <Button variant="default" onClick={handleShare}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Challenge
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
