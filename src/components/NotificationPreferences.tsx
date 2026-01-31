"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Heart, Calendar, AlertCircle, Building2 } from "lucide-react";

interface NotificationPreferencesProps {
  preferences: {
    notifyDonationComplete: boolean;
    notifyWeeklySummary: boolean;
    notifyNewMatch: boolean;
    notifyPaymentFailed: boolean;
    notifyBankDisconnected: boolean;
  };
  onChange: (key: string, value: boolean) => void;
}

const notificationOptions = [
  {
    key: "notifyDonationComplete",
    label: "Donation completed",
    description: "Get notified when a donation is processed successfully",
    icon: Heart,
  },
  {
    key: "notifyWeeklySummary",
    label: "Weekly summary",
    description: "Receive a weekly email with your donation summary",
    icon: Calendar,
  },
  {
    key: "notifyNewMatch",
    label: "New transaction matches",
    description: "Get notified when a transaction matches a cause you support",
    icon: Bell,
  },
  {
    key: "notifyPaymentFailed",
    label: "Payment issues",
    description: "Get notified if a payment fails or needs attention",
    icon: AlertCircle,
  },
  {
    key: "notifyBankDisconnected",
    label: "Bank connection issues",
    description: "Get notified if a bank account needs to be reconnected",
    icon: Building2,
  },
];

export function NotificationPreferences({
  preferences,
  onChange,
}: NotificationPreferencesProps) {
  return (
    <div className="space-y-4">
      {notificationOptions.map((option) => {
        const Icon = option.icon;
        const isEnabled = preferences[option.key as keyof typeof preferences];

        return (
          <div
            key={option.key}
            className="flex items-center justify-between p-4 rounded-lg border"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <Label
                  htmlFor={option.key}
                  className="text-base font-medium cursor-pointer"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
            <Switch
              id={option.key}
              checked={isEnabled}
              onCheckedChange={(checked) => onChange(option.key, checked)}
            />
          </div>
        );
      })}
    </div>
  );
}
