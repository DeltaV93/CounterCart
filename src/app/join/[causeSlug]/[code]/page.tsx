import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, TrendingUp, Trophy } from "lucide-react";

interface ClubInvitePageProps {
  params: Promise<{ causeSlug: string; code: string }>;
}

export async function generateMetadata({
  params,
}: ClubInvitePageProps): Promise<Metadata> {
  const { code } = await params;

  // Find the inviter by invite code
  const membership = await prisma.clubMember.findUnique({
    where: { inviteCode: code },
    include: {
      user: { select: { name: true } },
      club: {
        include: {
          cause: { select: { name: true } },
        },
      },
    },
  });

  const inviterName = membership?.user.name || "A friend";
  const clubName = membership?.club.name || "a club";
  const causeName = membership?.club.cause.name || "a cause";

  return {
    title: `${inviterName} invited you to join ${clubName}`,
    description: `Join the ${clubName} and support ${causeName} together. Track your impact and compete with other supporters.`,
    openGraph: {
      title: `${inviterName} invited you to join ${clubName}`,
      description: `Join the ${clubName} and support ${causeName} together. Track your impact and compete with other supporters.`,
      type: "website",
    },
  };
}

export default async function ClubInvitePage({ params }: ClubInvitePageProps) {
  const { causeSlug, code } = await params;

  // Find the membership by invite code
  const membership = await prisma.clubMember.findUnique({
    where: { inviteCode: code },
    include: {
      user: { select: { id: true, name: true } },
      club: {
        include: {
          cause: { select: { id: true, name: true, slug: true, iconName: true } },
        },
      },
    },
  });

  if (!membership) {
    redirect("/signup");
  }

  // Verify cause slug matches
  if (membership.club.cause.slug !== causeSlug) {
    redirect("/signup");
  }

  const { club, user: inviter } = membership;

  // Store invite code in cookie
  const cookieStore = await cookies();
  cookieStore.set("club_invite_code", code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  cookieStore.set("club_id", club.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Get top members for social proof
  const topMembers = await prisma.clubMember.findMany({
    where: { clubId: club.id },
    orderBy: { contributed: "desc" },
    take: 3,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Invite Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 text-sm font-display uppercase tracking-wider border-2 border-primary">
            <Users className="h-4 w-4" />
            Invited by {inviter.name || "a friend"}
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{club.name}</CardTitle>
            <CardDescription className="text-base">
              {club.description || `Join supporters fighting for ${club.cause.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-highlight">
                  {club.memberCount}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Members
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-accent">
                  ${Number(club.totalDonated).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Donated
                </div>
              </div>
            </div>

            {/* Top Members */}
            {topMembers.length > 0 && (
              <div className="space-y-3">
                <div className="font-display text-sm uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  Top Contributors
                </div>
                <div className="space-y-2">
                  {topMembers.map((member, i) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between text-sm p-2 border border-primary/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent text-accent-foreground flex items-center justify-center font-display text-xs">
                          {i + 1}
                        </span>
                        <span>{member.user.name || "Anonymous"}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">
                        ${Number(member.contributed).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href={`/signup?club=${club.slug}&invite=${code}`}>
                  Join {club.name}
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Free to join. Your donations will count toward the club&apos;s total.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="flex justify-center gap-8 text-muted-foreground text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{club.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Cause: {club.cause.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
