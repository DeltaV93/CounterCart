"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertCircle, Shield, Calendar, DollarSign } from "lucide-react";

interface MandateAgreementProps {
  bankName: string;
  accountMask: string;
  onAccept: (accepted: boolean) => void;
  donationMultiplier: number;
  monthlyLimit: number | null;
}

export function MandateAgreement({
  bankName,
  accountMask,
  onAccept,
  donationMultiplier,
  monthlyLimit,
}: MandateAgreementProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDebit, setAcceptedDebit] = useState(false);

  const allAccepted = acceptedTerms && acceptedDebit;

  const handleTermsChange = (checked: boolean) => {
    setAcceptedTerms(checked);
    onAccept(checked && acceptedDebit);
  };

  const handleDebitChange = (checked: boolean) => {
    setAcceptedDebit(checked);
    onAccept(acceptedTerms && checked);
  };

  return (
    <div className="space-y-6">
      {/* Key information summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">How donations are calculated</p>
            <p className="text-sm text-muted-foreground">
              Round up each matched transaction to the nearest dollar
              {donationMultiplier > 1 && `, multiplied by ${donationMultiplier}x`}.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Weekly processing</p>
            <p className="text-sm text-muted-foreground">
              Donations are batched and debited every Sunday evening.
            </p>
          </div>
        </div>

        {monthlyLimit && (
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Monthly limit: ${monthlyLimit}</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ll never debit more than this amount per month.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detailed terms */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="terms">
          <AccordionTrigger className="text-sm">
            View full ACH authorization terms
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-4">
            <p>
              By authorizing ACH debits, you agree to the following terms:
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Authorization:</strong> You authorize CounterCart to
                electronically debit your account at {bankName} (ending in{" "}
                {accountMask}) for the amounts calculated based on your matched
                transactions.
              </li>
              <li>
                <strong>Timing:</strong> Debits will be initiated weekly on
                Sundays. ACH transfers typically take 2-3 business days to
                complete.
              </li>
              <li>
                <strong>Limits:</strong> Individual debits will not exceed your
                weekly batch total.{" "}
                {monthlyLimit
                  ? `Monthly debits will not exceed $${monthlyLimit}.`
                  : "You can set a monthly limit in your settings."}
              </li>
              <li>
                <strong>Cancellation:</strong> You may revoke this authorization
                at any time by disabling auto-donations in your settings.
                Cancellation will take effect before the next scheduled debit.
              </li>
              <li>
                <strong>Failed Payments:</strong> If a debit fails due to
                insufficient funds or other reasons, we will notify you and
                pause auto-donations until the issue is resolved.
              </li>
              <li>
                <strong>Disputes:</strong> You have the right to dispute any
                erroneous debit. Contact us or your bank to initiate a dispute.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Checkboxes */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={handleTermsChange}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="terms"
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              I have read and agree to the ACH authorization terms above
            </Label>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="debit"
            checked={acceptedDebit}
            onCheckedChange={handleDebitChange}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="debit"
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              I authorize CounterCart to debit my account at {bankName} (
              ****{accountMask}) for donation amounts
            </Label>
          </div>
        </div>
      </div>

      {/* Warning */}
      {!allAccepted && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <p>You must accept both terms to enable automatic donations.</p>
        </div>
      )}
    </div>
  );
}
