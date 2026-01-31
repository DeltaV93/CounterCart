"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { Building2, ArrowRight, CheckCircle, Lock } from "lucide-react";

export default function ConnectBankPage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [bankName, setBankName] = useState<string | null>(null);
  const [accountCount, setAccountCount] = useState<number>(0);

  const handlePlaidSuccess = (institutionName: string, accounts: number) => {
    setBankName(institutionName);
    setAccountCount(accounts);
    setIsConnected(true);
  };

  const handleSkip = () => {
    router.push("/onboarding/preferences");
  };

  const handleContinue = () => {
    router.push("/onboarding/preferences");
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Connect your bank</CardTitle>
        <CardDescription>
          Link your bank account to automatically detect purchases at businesses
          and offset them with donations to your chosen causes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConnected ? (
          <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-950 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Connected to {bankName}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {accountCount} account{accountCount !== 1 ? "s" : ""} linked. We&apos;ll start tracking your transactions.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Bank-level security</p>
                  <p className="text-sm text-muted-foreground">
                    We use Plaid, trusted by millions, to securely connect to your bank.
                    We never see your login credentials.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Read-only access</p>
                  <p className="text-sm text-muted-foreground">
                    We can only view transactions. We cannot move money or make changes
                    to your account.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        {isConnected ? (
          <Button className="w-full" size="lg" onClick={handleContinue}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <>
            <PlaidLinkButton onSuccess={handlePlaidSuccess} />
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
