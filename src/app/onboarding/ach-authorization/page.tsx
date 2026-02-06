"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MandateAgreement } from "@/components/ach/MandateAgreement";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BankAccount {
  id: string;
  name: string;
  mask: string | null;
  institutionName: string;
  type: string;
  achAuthorizedAt?: string | null;
}

interface UserSettings {
  donationMultiplier: number;
  monthlyLimit: number | null;
}

export default function AchAuthorizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard/settings";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [mandateAccepted, setMandateAccepted] = useState(false);

  // Check if ACH is already set up
  const [achStatus, setAchStatus] = useState<{
    enabled: boolean;
    bankAccount: BankAccount | null;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch bank accounts, user settings, and ACH status in parallel
        const [accountsRes, settingsRes, achRes] = await Promise.all([
          fetch("/api/plaid/accounts"),
          fetch("/api/user/settings"),
          fetch("/api/donations/setup-ach"),
        ]);

        if (!accountsRes.ok || !settingsRes.ok || !achRes.ok) {
          throw new Error("Failed to load data");
        }

        const accountsData = await accountsRes.json();
        const settingsData = await settingsRes.json();
        const achData = await achRes.json();

        // Filter to only checking/savings accounts
        const depositoryAccounts = accountsData.filter(
          (a: BankAccount) => a.type === "depository"
        );
        setBankAccounts(depositoryAccounts);

        setUserSettings({
          donationMultiplier: settingsData.donationMultiplier,
          monthlyLimit: settingsData.monthlyLimit,
        });

        setAchStatus(achData);

        // Pre-select the first account if available
        if (depositoryAccounts.length > 0) {
          setSelectedAccountId(depositoryAccounts[0].id);
        }
      } catch (err) {
        setError("Failed to load account information");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSetupAch = async () => {
    if (!selectedAccountId || !mandateAccepted) return;

    setIsSaving(true);
    setError(null);

    try {
      // Step 1: Initialize ACH setup
      const initResponse = await fetch("/api/donations/setup-ach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId: selectedAccountId }),
      });

      if (!initResponse.ok) {
        const data = await initResponse.json();
        throw new Error(data.error || "Failed to initialize ACH setup");
      }

      const { setupIntentId } = await initResponse.json();

      // Step 2: For now, we'll simulate the Stripe.js flow
      // In production, this would use Stripe.js to confirm the SetupIntent
      // and collect the payment method

      // For demo purposes, complete the setup directly
      const completeResponse = await fetch("/api/donations/setup-ach", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupIntentId,
          paymentMethodId: `pm_demo_${Date.now()}`, // In production, this comes from Stripe.js
          bankAccountId: selectedAccountId,
        }),
      });

      if (!completeResponse.ok) {
        const data = await completeResponse.json();
        throw new Error(data.error || "Failed to complete ACH setup");
      }

      setSuccess(true);

      // Redirect after success
      setTimeout(() => {
        router.push(returnTo);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up ACH");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Auto-donations enabled!
          </h3>
          <p className="text-muted-foreground">
            Your donations will now be processed automatically each week.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (achStatus?.enabled) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Auto-donations are active</CardTitle>
          <CardDescription>
            Your account is already set up for automatic donations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="font-medium">Connected account</p>
            <p className="text-sm text-muted-foreground">
              {achStatus.bankAccount?.institutionName} ****
              {achStatus.bankAccount?.mask}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Authorized on{" "}
              {achStatus.bankAccount?.achAuthorizedAt
                ? new Date(
                    achStatus.bankAccount.achAuthorizedAt
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(returnTo)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              await fetch("/api/donations/setup-ach", { method: "DELETE" });
              router.refresh();
            }}
          >
            Disable auto-donations
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">No bank account connected</CardTitle>
          <CardDescription>
            You need to connect a checking or savings account to enable
            automatic donations.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => router.push("/onboarding/connect")}
          >
            Connect a bank account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Enable automatic donations</CardTitle>
        <CardDescription>
          Set up ACH direct debit to automatically donate each week without
          manual approval.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bank account selection */}
        <div className="space-y-3">
          <Label>Select bank account for donations</Label>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.institutionName} - {account.name} (****
                  {account.mask})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mandate agreement */}
        {selectedAccount && userSettings && (
          <MandateAgreement
            bankName={selectedAccount.institutionName}
            accountMask={selectedAccount.mask || "****"}
            donationMultiplier={userSettings.donationMultiplier}
            monthlyLimit={userSettings.monthlyLimit}
            onAccept={setMandateAccepted}
          />
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(returnTo)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSetupAch}
          disabled={!mandateAccepted || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Enable auto-donations
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
