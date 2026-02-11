"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { track, AnalyticsEvents } from "@/lib/analytics";

interface BadgeEmbedCodeProps {
  userId: string;
}

type BadgeStyle = "minimal" | "detailed" | "compact";

interface BadgeDimensions {
  width: number;
  height: number;
  description: string;
}

const BADGE_STYLES: Record<BadgeStyle, BadgeDimensions> = {
  minimal: {
    width: 120,
    height: 30,
    description: "Small badge with amount and logo",
  },
  detailed: {
    width: 300,
    height: 100,
    description: "Large badge with full stats",
  },
  compact: {
    width: 80,
    height: 20,
    description: "Tiny badge for inline use",
  },
};

export function BadgeEmbedCode({ userId }: BadgeEmbedCodeProps) {
  const [style, setStyle] = useState<BadgeStyle>("minimal");
  const [copied, setCopied] = useState<"html" | "markdown" | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";
  const badgeUrl = `${appUrl}/api/badge/${userId}?style=${style}`;
  const linkUrl = `${appUrl}/badge/${userId}`;
  const { width, height } = BADGE_STYLES[style];

  const htmlCode = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeUrl}" alt="CounterCart Impact Badge" width="${width}" height="${height}" />
</a>`;

  const markdownCode = `[![CounterCart Impact Badge](${badgeUrl})](${linkUrl})`;

  const copyToClipboard = async (code: string, type: "html" | "markdown") => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(type);
      toast.success(`${type === "html" ? "HTML" : "Markdown"} code copied!`);
      track(AnalyticsEvents.BADGE_ENABLED);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="space-y-6">
      {/* Style Selector */}
      <div className="space-y-2">
        <Label>Badge Style</Label>
        <Select value={style} onValueChange={(v) => setStyle(v as BadgeStyle)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minimal">
              Minimal (120x30) - Small badge with amount
            </SelectItem>
            <SelectItem value="detailed">
              Detailed (300x100) - Full stats badge
            </SelectItem>
            <SelectItem value="compact">
              Compact (80x20) - Tiny inline badge
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {BADGE_STYLES[style].description}
        </p>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="p-6 bg-muted/50 border border-border flex items-center justify-center min-h-[120px]">
          {/* Using img tag directly for preview since it's a dynamic image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={style} // Force re-render when style changes
            src={badgeUrl}
            alt="CounterCart Impact Badge"
            width={width}
            height={height}
            className="border border-border"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Badge updates automatically (cached for 1 hour)
        </p>
      </div>

      {/* HTML Code */}
      <div className="space-y-2">
        <Label>HTML Embed Code</Label>
        <div className="relative">
          <pre className="p-4 bg-muted text-muted-foreground text-xs font-mono overflow-x-auto border border-border">
            {htmlCode}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(htmlCode, "html")}
          >
            {copied === "html" ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use this for websites, blogs, or HTML email signatures
        </p>
      </div>

      {/* Markdown Code */}
      <div className="space-y-2">
        <Label>Markdown Embed Code</Label>
        <div className="relative">
          <pre className="p-4 bg-muted text-muted-foreground text-xs font-mono overflow-x-auto border border-border">
            {markdownCode}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(markdownCode, "markdown")}
          >
            {copied === "markdown" ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use this for GitHub READMEs or markdown-based platforms
        </p>
      </div>

      {/* Direct Links */}
      <div className="space-y-2">
        <Label>Direct Links</Label>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
            <span className="text-muted-foreground truncate mr-2">
              Badge Image: {badgeUrl}
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a href={badgeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
            <span className="text-muted-foreground truncate mr-2">
              Click-through: {linkUrl}
            </span>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
