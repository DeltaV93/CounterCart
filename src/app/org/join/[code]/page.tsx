import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Users, TrendingUp, Sparkles, Check } from "lucide-react";
import { JoinOrgForm } from "./JoinOrgForm";

interface OrgInvitePageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: OrgInvitePageProps): Promise<Metadata> {
  const { code } = await params;

  const organization = await prisma.organization.findUnique({
    where: { inviteCode: code },
  });

  const orgName = organization?.name || "an organization";

  return {
    title: `Join ${orgName} on CounterCart`,
    description: `You've been invited to join ${orgName}. Get Premium access and start making an impact with your team.`,
    openGraph: {
      title: `Join ${orgName} on CounterCart`,
      description: `You've been invited to join ${orgName}. Get Premium access and start making an impact with your team.`,
      type: "website",
    },
  };
}

export default async function OrgInvitePage({ params }: OrgInvitePageProps) {
  const { code } = await params;

  // Find the organization
  const organization = await prisma.organization.findUnique({
    where: { inviteCode: code },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  if (!organization) {
    redirect("/signup");
  }

  // Store invite code in cookie
  const cookieStore = await cookies();
  cookieStore.set("org_invite_code", code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Check if user is logged in
  const user = await getCurrentUser();

  // If user is logged in, check if already in an org
  let alreadyMember = false;
  let alreadyInOrg = false;

  if (user) {
    const existingMembership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
    });

    if (existingMembership) {
      if (existingMembership.orgId === organization.id) {
        alreadyMember = true;
      } else {
        alreadyInOrg = true;
      }
    }
  }

  const benefits = [
    "Premium features included",
    "Unlimited causes",
    "Auto-donate capabilities",
    "Full tax documentation",
    "Join your team's impact",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Invite Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 text-sm font-display uppercase tracking-wider border-2 border-primary">
            <Building2 className="h-4 w-4" />
            Team Invitation
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            {organization.logoUrl && (
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-16 w-auto"
                />
              </div>
            )}
            <CardTitle className="text-3xl">{organization.name}</CardTitle>
            <CardDescription className="text-base">
              You&apos;ve been invited to join {organization.name} on CounterCart
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-highlight">
                  {organization._count.members}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Team Members
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 p-4 text-center">
                <div className="font-display text-2xl text-accent">
                  ${Number(organization.totalDonated).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Team Impact
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <div className="font-display text-sm uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                What You Get
              </div>
              <div className="space-y-2">
                {benefits.map((benefit, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm p-2 border border-primary/20"
                  >
                    <div className="w-5 h-5 bg-accent flex items-center justify-center">
                      <Check className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              {alreadyMember ? (
                <>
                  <div className="text-center p-4 bg-accent/10 border border-accent">
                    <p className="font-medium">You&apos;re already a member!</p>
                  </div>
                  <Button asChild className="w-full" size="lg">
                    <Link href="/company-admin">Go to Team Dashboard</Link>
                  </Button>
                </>
              ) : alreadyInOrg ? (
                <div className="text-center p-4 bg-destructive/10 border border-destructive">
                  <p className="font-medium">You&apos;re already in another organization</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You must leave your current organization to join a new one.
                  </p>
                </div>
              ) : user ? (
                <JoinOrgForm orgName={organization.name} inviteCode={code} />
              ) : (
                <Button asChild className="w-full" size="lg">
                  <Link href={`/signup?org=${organization.slug}&invite=${code}`}>
                    Join {organization.name}
                  </Link>
                </Button>
              )}
              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link href={`/login?redirect=/org/join/${code}`} className="text-accent hover:underline">
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="flex justify-center gap-8 text-muted-foreground text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{organization._count.members} members</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Premium included</span>
          </div>
        </div>
      </div>
    </div>
  );
}
