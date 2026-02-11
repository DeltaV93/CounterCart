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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Shield,
  Loader2,
  UserCog,
} from "lucide-react";

interface OrganizationData {
  organization: {
    id: string;
    name: string;
    slug: string;
    inviteCode: string;
    seatCount: number;
    maxSeats: number;
  };
  membership: {
    id: string;
    role: string;
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

export default function MembersPage() {
  const router = useRouter();
  const [data, setData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const orgData = await response.json();
        if (!orgData.organization) {
          router.push("/for-teams");
          return;
        }
        setData(orgData);

        // Check if user has admin access
        if (!["admin", "owner"].includes(orgData.membership.role)) {
          router.push("/company-admin");
        }
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

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const response = await fetch("/api/organizations/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        toast.success("Member removed");
        setRemoveDialogOpen(null);
        fetchOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: "member" | "admin") => {
    setUpdatingId(memberId);
    try {
      const response = await fetch("/api/organizations/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (response.ok) {
        toast.success("Role updated");
        fetchOrganization();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full bg-[var(--counter-cream)] border-b-2 border-primary">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Skeleton className="w-8 h-8" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { organization, membership, members } = data;
  const isOwner = membership.role === "owner";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[var(--counter-cream)] border-b-2 border-primary">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/company-admin">
              <Button variant="ghost" size="icon-sm" className="text-foreground hover:text-accent hover:bg-transparent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="text-foreground font-medium">
                {organization.name}
              </span>
              <span className="text-foreground/50">/</span>
              <span className="text-foreground">Members</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Team Members
              </h1>
              <p className="text-muted-foreground">
                {organization.seatCount} of {organization.maxSeats} seats used
              </p>
            </div>
            <Button onClick={handleCopyInvite}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Invite Link
                </>
              )}
            </Button>
          </div>

          {/* Invite Card */}
          <Card variant="accent">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  <div>
                    <p className="font-medium">
                      {organization.maxSeats - organization.seatCount} seats available
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Share the invite link to add more team members
                    </p>
                  </div>
                </div>
                <code className="font-mono text-sm bg-background/50 px-3 py-1.5 border">
                  {organization.inviteCode}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>
                Manage your team members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-primary/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted border-2 border-primary flex items-center justify-center font-display text-lg">
                        {(member.name || member.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.name || "Unnamed"}
                          </p>
                          {member.role === "owner" && (
                            <Badge className="bg-accent">Owner</Badge>
                          )}
                          {member.role === "admin" && (
                            <Badge variant="secondary">Admin</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {member.role !== "owner" && isOwner && (
                      <div className="flex items-center gap-2">
                        {/* Role Select */}
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleUpdateRole(member.id, value as "member" | "admin")
                          }
                          disabled={updatingId === member.id}
                        >
                          <SelectTrigger className="w-32">
                            {updatingId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Member
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Remove Button */}
                        <Dialog
                          open={removeDialogOpen === member.id}
                          onOpenChange={(open) =>
                            setRemoveDialogOpen(open ? member.id : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Remove Member</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to remove{" "}
                                <strong>{member.name || member.email}</strong> from
                                the organization? They will lose Premium access.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setRemoveDialogOpen(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removingId === member.id}
                              >
                                {removingId === member.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  "Remove Member"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {/* Admin actions (can only remove members, not other admins) */}
                    {member.role === "member" && membership.role === "admin" && (
                      <Dialog
                        open={removeDialogOpen === member.id}
                        onOpenChange={(open) =>
                          setRemoveDialogOpen(open ? member.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Member</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove{" "}
                              <strong>{member.name || member.email}</strong> from
                              the organization?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setRemoveDialogOpen(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={removingId === member.id}
                            >
                              {removingId === member.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Removing...
                                </>
                              ) : (
                                "Remove Member"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No team members yet</p>
                    <p className="text-sm mt-1">
                      Share your invite link to add team members
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-muted/50 border">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Users className="h-4 w-4" />
                    Member
                  </div>
                  <p className="text-muted-foreground">
                    Can use CounterCart with Premium features
                  </p>
                </div>
                <div className="p-3 bg-muted/50 border">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Shield className="h-4 w-4" />
                    Admin
                  </div>
                  <p className="text-muted-foreground">
                    Can invite/remove members and view reports
                  </p>
                </div>
                <div className="p-3 bg-accent/20 border border-accent">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Building2 className="h-4 w-4" />
                    Owner
                  </div>
                  <p className="text-muted-foreground">
                    Full control including billing and admin management
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
