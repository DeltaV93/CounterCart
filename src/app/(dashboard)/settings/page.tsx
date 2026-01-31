"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { track, AnalyticsEvents } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DollarSign,
  Loader2,
  Save,
  Sparkles,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { BankAccountList } from "@/components/BankAccountList";
import { NotificationPreferences } from "@/components/NotificationPreferences";

interface UserSettings {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  donationMultiplier: number;
  monthlyLimit: number | null;
  autoDonateEnabled: boolean;
  onboardingComplete: boolean;
  stripeCustomerId: string | null;
  // Notification preferences
  notifyDonationComplete: boolean;
  notifyWeeklySummary: boolean;
  notifyNewMatch: boolean;
  notifyPaymentFailed: boolean;
  notifyBankDisconnected: boolean;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [name, setName] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [autoDonate, setAutoDonate] = useState(false);
  const [notifications, setNotifications] = useState({
    notifyDonationComplete: true,
    notifyWeeklySummary: true,
    notifyNewMatch: false,
    notifyPaymentFailed: true,
    notifyBankDisconnected: true,
  });

  // Handle upgrade result from URL params
  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    if (upgrade === "success") {
      toast.success("Welcome to Premium! Your subscription is now active.");
      track(AnalyticsEvents.SUBSCRIPTION_UPGRADED);
      // Clean up URL
      window.history.replaceState({}, "", "/settings");
    } else if (upgrade === "cancelled") {
      toast.info("Upgrade cancelled. You can upgrade anytime from settings.");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          setName(data.name || "");
          setMultiplier(data.donationMultiplier?.toString() || "1");
          setMonthlyLimit(data.monthlyLimit?.toString() || "25");
          setAutoDonate(data.autoDonateEnabled || false);
          setNotifications({
            notifyDonationComplete: data.notifyDonationComplete ?? true,
            notifyWeeklySummary: data.notifyWeeklySummary ?? true,
            notifyNewMatch: data.notifyNewMatch ?? false,
            notifyPaymentFailed: data.notifyPaymentFailed ?? true,
            notifyBankDisconnected: data.notifyBankDisconnected ?? true,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          donationMultiplier: parseFloat(multiplier),
          monthlyLimit: parseFloat(monthlyLimit),
          autoDonateEnabled: autoDonate,
          ...notifications,
        }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
        track(AnalyticsEvents.SETTINGS_UPDATED);
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start upgrade");
      }

      const { url } = await response.json();

      // Track subscription started
      track(AnalyticsEvents.SUBSCRIPTION_STARTED);

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error starting upgrade:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start upgrade");
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to open billing portal");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
      setIsManaging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan and benefits</CardDescription>
            </div>
            <Badge
              variant={
                settings?.subscriptionTier === "premium" ? "default" : "secondary"
              }
            >
              {settings?.subscriptionTier === "premium" ? (
                <>
                  <Sparkles className="mr-1 h-3 w-3" />
                  Premium
                </>
              ) : (
                "Free"
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {settings?.subscriptionTier === "free" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upgrade to Premium to unlock auto-weekly donations, higher limits,
                and more.
              </p>
              <Button onClick={handleUpgrade} disabled={isUpgrading}>
                {isUpgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade to Premium - $4.99/mo
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You&apos;re on the Premium plan. Enjoy unlimited causes, auto-donations, and
                more!
              </p>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isManaging}
              >
                {isManaging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={settings?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Donation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Donation Preferences</CardTitle>
          <CardDescription>Configure how donations are calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Donation Multiplier</Label>
            <Select value={multiplier} onValueChange={setMultiplier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x (standard)</SelectItem>
                <SelectItem value="2">2x (double impact)</SelectItem>
                <SelectItem value="3">3x (triple impact)</SelectItem>
                <SelectItem value="5">5x (maximum impact)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Multiply your round-up donation by this factor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Monthly Limit</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="limit"
                type="number"
                min="5"
                max="1000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum amount to donate per month
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoDonate">Auto-donate weekly</Label>
              <p className="text-sm text-muted-foreground">
                Automatically process donations every Sunday
              </p>
            </div>
            <Checkbox
              id="autoDonate"
              checked={autoDonate}
              onCheckedChange={(checked) => setAutoDonate(checked === true)}
              disabled={settings?.subscriptionTier !== "premium"}
            />
          </div>
          {settings?.subscriptionTier !== "premium" && (
            <p className="text-xs text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-1" />
              Auto-donate is a Premium feature
            </p>
          )}
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your bank connections</CardDescription>
        </CardHeader>
        <CardContent>
          <BankAccountList />
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which emails you&apos;d like to receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferences
            preferences={notifications}
            onChange={(key, value) =>
              setNotifications((prev) => ({ ...prev, [key]: value }))
            }
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>
            Export or delete your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Download className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Export My Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your data as JSON
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={async () => {
                setIsExporting(true);
                try {
                  const response = await fetch("/api/user/export");
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `countercart-export-${new Date().toISOString().split("T")[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success("Data exported successfully");
                  } else {
                    toast.error("Failed to export data");
                  }
                } catch {
                  toast.error("Failed to export data");
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete your account? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Your profile and preferences</li>
                    <li>All connected bank accounts</li>
                    <li>Transaction and donation history</li>
                    <li>Any active subscriptions</li>
                  </ul>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        const response = await fetch("/api/user/delete", {
                          method: "DELETE",
                        });

                        if (response.ok) {
                          // Redirect to home page after deletion
                          window.location.href = "/";
                        } else {
                          const data = await response.json();
                          toast.error(data.error || "Failed to delete account");
                          setIsDeleting(false);
                        }
                      } catch {
                        toast.error("Failed to delete account");
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Yes, delete my account"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
