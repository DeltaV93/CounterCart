"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Building2,
  Users,
  TrendingUp,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  FileText,
  ArrowRight,
  LogOut,
  Loader2,
} from "lucide-react";

interface OrganizationData {
  organization: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    inviteCode: string;
    plan: string;
    seatCount: number;
    maxSeats: number;
    totalDonated: number;
    logoUrl: string | null;
    createdAt: string;
  };
  membership: {
    id: string;
    role: string;
    joinedAt: string;
  };
  members: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string;
    role: string;
    joinedAt: string;
  }>;
}

export default function CompanyAdminPage() {
  const router = useRouter();
  const [data, setData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const orgData = await response.json();
        if (!orgData.organization) {
          // Not in an organization, redirect to for-teams page
          router.push("/for-teams");
          return;
        }
        setData(orgData);
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      toast.error("Failed to load organization data");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const handleCopyInvite = async () => {
    if (!data) return;

    const inviteUrl = `${window.location.origin}/org/join/${data.organization.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/organizations/invite", {
        method: "POST",
      });

      if (response.ok) {
        const { inviteCode } = await response.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                organization: { ...prev.organization, inviteCode },
              }
            : null
        );
        toast.success("Invite code regenerated");
      } else {
        toast.error("Failed to regenerate code");
      }
    } catch {
      toast.error("Failed to regenerate code");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this organization?")) return;

    setIsLeaving(true);
    try {
      const response = await fetch("/api/organizations/leave", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Left organization");
        router.push("/dashboard");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to leave organization");
      }
    } catch {
      toast.error("Failed to leave organization");
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full bg-[var(--counter-cream)] border-b-2 border-primary">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="w-32 h-6" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { organization, membership, members } = data;
  const isAdmin = ["admin", "owner"].includes(membership.role);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[var(--counter-cream)] border-b-2 border-primary">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent border-2 border-primary flex items-center justify-center font-mono font-bold text-primary">
                ↻
              </div>
              <span className="headline text-foreground text-lg tracking-wider hidden sm:inline">
                COUNTERCART
              </span>
            </Link>
            <span className="text-foreground/50">/</span>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="text-foreground font-medium">
                {organization.name}
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-foreground hover:text-accent hover:bg-transparent">
                My Dashboard
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/company-admin/members">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-accent hover:bg-transparent">
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {organization.name}
                </h1>
                <Badge variant="secondary">{membership.role}</Badge>
              </div>
              <p className="text-muted-foreground">
                Team dashboard - {organization.seatCount} members
              </p>
            </div>
            {membership.role !== "owner" && (
              <Button
                variant="ghost"
                onClick={handleLeave}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave Organization
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organization.seatCount}
                  <span className="text-muted-foreground text-sm font-normal">
                    /{organization.maxSeats}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {organization.maxSeats - organization.seatCount} seats available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Team Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${organization.totalDonated.toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Combined donations
                </p>
              </CardContent>
            </Card>

            <Card variant="accent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {organization.plan}
                </div>
                <p className="text-xs text-muted-foreground">
                  $3/seat/month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Invite Section */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Invite Team Members
                </CardTitle>
                <CardDescription>
                  Share this link with your team to let them join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted/50 border-2 border-primary p-3 font-mono text-sm break-all">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/org/join/${organization.inviteCode}`}
                  </div>
                  <Button variant="outline" onClick={handleCopyInvite}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Invite code: <code className="font-mono">{organization.inviteCode}</code>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateCode}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2">
            {isAdmin && (
              <Link href="/company-admin/members">
                <Card hover className="h-full">
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className="w-12 h-12 bg-accent border-2 border-primary flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg uppercase tracking-wider">
                        Manage Members
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        View, invite, or remove team members
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}

            {isAdmin && (
              <Card hover className="h-full cursor-pointer" onClick={() => router.push("/company-admin/report")}>
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 bg-accent border-2 border-primary flex items-center justify-center">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg uppercase tracking-wider">
                      CSR Report
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Generate impact reports for stakeholders
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {members.length} member{members.length !== 1 ? "s" : ""} on your team
                </CardDescription>
              </div>
              {isAdmin && (
                <Link href="/company-admin/members">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted border border-primary flex items-center justify-center font-display text-sm">
                        {(member.name || member.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.name || "Unnamed"}
                          {member.userId === membership.id && (
                            <span className="text-muted-foreground text-sm ml-2">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{member.role}</Badge>
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No team members yet. Share the invite link to get started!
                  </div>
                )}

                {members.length > 5 && (
                  <Link href="/company-admin/members">
                    <Button variant="ghost" className="w-full">
                      View all {members.length} members
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
