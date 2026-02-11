"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OffsetReceipt } from "./OffsetReceipt";
import {
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
  getReferralUrl,
  generateShareText,
} from "@/lib/share";
import { trackShare } from "@/lib/analytics";
import { Copy, Twitter, Linkedin, Facebook, Check } from "lucide-react";

interface ReceiptData {
  businesses: Array<{ name: string; amount: number }>;
  charities: Array<{ name: string }>;
  totalSpent: number;
  totalDonated: number;
  referralCode: string;
  weekOf?: string;
}

interface ShareReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
  isLoading?: boolean;
}

export function ShareReceiptModal({
  open,
  onOpenChange,
  data,
  isLoading = false,
}: ShareReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data && !isLoading) return null;

  const handleShare = (platform: "twitter" | "facebook" | "linkedin") => {
    if (!data) return;

    const text = generateShareText(data);
    const url = getReferralUrl(data.referralCode);

    let shareUrl: string;
    switch (platform) {
      case "twitter":
        shareUrl = getTwitterShareUrl(text, url);
        break;
      case "facebook":
        shareUrl = getFacebookShareUrl(url);
        break;
      case "linkedin":
        shareUrl = getLinkedInShareUrl(url, text);
        break;
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
    trackShare(platform);
  };

  const handleCopy = async () => {
    if (!data) return;

    const url = getReferralUrl(data.referralCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      trackShare("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Impact</DialogTitle>
          <DialogDescription>
            Show your network how you&apos;re making a difference
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Receipt Preview */}
            <div className="border-2 border-primary">
              <OffsetReceipt data={data} />
            </div>

            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleShare("twitter")}
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleShare("linkedin")}
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your referral link: countercart.app/r/{data.referralCode}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
