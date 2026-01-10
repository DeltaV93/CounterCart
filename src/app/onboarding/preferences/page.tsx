"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Settings, Loader2, ArrowRight, DollarSign } from "lucide-react";

export default function PreferencesPage() {
  const router = useRouter();
  const [donationType, setDonationType] = useState("roundup");
  const [multiplier, setMultiplier] = useState("1");
  const [monthlyLimit, setMonthlyLimit] = useState("25");
  const [isSaving, setIsSaving] = useState(false);

  const handleComplete = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donationMultiplier: parseFloat(multiplier),
          monthlyLimit: parseFloat(monthlyLimit),
          onboardingComplete: true,
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Set your preferences</CardTitle>
        <CardDescription>
          Customize how you want to donate when we detect matching transactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Donation amount</Label>
          <Select value={donationType} onValueChange={setDonationType}>
            <SelectTrigger>
              <SelectValue placeholder="Select donation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roundup">Round up to nearest dollar</SelectItem>
              <SelectItem value="fixed">Fixed amount per transaction</SelectItem>
              <SelectItem value="percent">Percentage of transaction</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {donationType === "roundup" && "Each transaction will be rounded up to the nearest dollar for donation."}
            {donationType === "fixed" && "A fixed amount will be donated for each matching transaction."}
            {donationType === "percent" && "A percentage of each transaction will be donated."}
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="multiplier">Donation multiplier</Label>
          <Select value={multiplier} onValueChange={setMultiplier}>
            <SelectTrigger>
              <SelectValue placeholder="Select multiplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x (standard)</SelectItem>
              <SelectItem value="2">2x (double impact)</SelectItem>
              <SelectItem value="3">3x (triple impact)</SelectItem>
              <SelectItem value="5">5x (maximum impact)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Multiply your donation amount by this factor. For example, 2x means a $0.50 round-up becomes $1.00.
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="limit">Monthly donation limit</Label>
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
          <p className="text-sm text-muted-foreground">
            We won&apos;t donate more than this amount in a single month. You can change this anytime.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Example calculation</h4>
          <p className="text-sm text-muted-foreground">
            If you buy a $12.50 meal at a matching restaurant:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>
              Round-up amount: <span className="font-medium">$0.50</span>
            </li>
            <li>
              With {multiplier}x multiplier:{" "}
              <span className="font-medium text-primary">
                ${(0.5 * parseFloat(multiplier)).toFixed(2)}
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={handleComplete}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Complete setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
