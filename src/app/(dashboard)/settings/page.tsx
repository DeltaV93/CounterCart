"use client";

import { useState, useEffect } from "react";
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
  Settings,
  DollarSign,
  Loader2,
  Save,
  Sparkles,
  Building2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

interface UserSettings {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  donationMultiplier: number;
  monthlyLimit: number | null;
  autoDonateEnabled: boolean;
  onboardingComplete: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [autoDonate, setAutoDonate] = useState(false);

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
        }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
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
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Premium - $4.99/mo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You&apos;re on the Premium plan. Enjoy unlimited causes, auto-donations, and
              more!
            </p>
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
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Bank Account</p>
                <p className="text-sm text-muted-foreground">
                  Connect via Plaid to track transactions
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/onboarding/connect">Manage</a>
            </Button>
          </div>
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
    </div>
  );
}
