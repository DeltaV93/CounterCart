"use client";

import { formatCurrency } from "@/lib/share";

interface ReceiptData {
  businesses: Array<{ name: string; amount: number }>;
  charities: Array<{ name: string }>;
  totalSpent: number;
  totalDonated: number;
  referralCode: string;
  weekOf?: string;
}

interface OffsetReceiptProps {
  data: ReceiptData;
}

export function OffsetReceipt({ data }: OffsetReceiptProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

  return (
    <div className="bg-primary text-primary-foreground p-6 border-2 border-primary font-mono text-sm">
      {/* Header */}
      <div className="text-center border-b border-dashed border-primary-foreground/30 pb-4 mb-4">
        <div className="font-display text-lg uppercase tracking-wider">
          CounterCart
        </div>
        <div className="text-xs text-primary-foreground/70 mt-1">
          Offset Receipt
        </div>
        {data.weekOf && (
          <div className="text-xs text-primary-foreground/70">
            Week of {data.weekOf}
          </div>
        )}
      </div>

      {/* Businesses Spent At */}
      <div className="mb-4">
        <div className="text-accent font-display text-xs uppercase tracking-wider mb-2">
          Spent At
        </div>
        <div className="space-y-1">
          {data.businesses.map((business, i) => (
            <div key={i} className="flex justify-between">
              <span className="truncate mr-2">{business.name}</span>
              <span className="text-primary-foreground/70 tabular-nums">
                {formatCurrency(business.amount)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-primary-foreground/30 mt-2 pt-2 flex justify-between font-bold">
          <span>Total Spent</span>
          <span className="text-accent tabular-nums">
            {formatCurrency(data.totalSpent)}
          </span>
        </div>
      </div>

      {/* Charities Offset To */}
      <div className="mb-4">
        <div className="text-highlight font-display text-xs uppercase tracking-wider mb-2">
          Offset To
        </div>
        <div className="space-y-1">
          {data.charities.map((charity, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-highlight">+</span>
              <span>{charity.name}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-primary-foreground/30 mt-2 pt-2 flex justify-between font-bold">
          <span>Total Donated</span>
          <span className="text-highlight tabular-nums">
            {formatCurrency(data.totalDonated)}
          </span>
        </div>
      </div>

      {/* Footer with QR/Link */}
      <div className="border-t border-dashed border-primary-foreground/30 pt-4 text-center">
        <div className="text-xs text-primary-foreground/70 mb-2">
          Offset your purchases too
        </div>
        <div className="font-display text-xs uppercase tracking-wider text-accent break-all">
          {appUrl}/r/{data.referralCode}
        </div>
      </div>
    </div>
  );
}
