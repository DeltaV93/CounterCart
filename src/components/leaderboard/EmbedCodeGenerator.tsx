"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check, Copy, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmbedCodeGeneratorProps {
  baseUrl: string;
  className?: string;
}

type EmbedStyle = "minimal" | "detailed";
type EmbedTheme = "light" | "dark";

export function EmbedCodeGenerator({
  baseUrl,
  className,
}: EmbedCodeGeneratorProps) {
  const [style, setStyle] = useState<EmbedStyle>("minimal");
  const [theme, setTheme] = useState<EmbedTheme>("light");
  const [copied, setCopied] = useState<"iframe" | "js" | null>(null);

  const embedUrl = `${baseUrl}/embed/counter?style=${style}&theme=${theme}`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="${style === "minimal" ? "120" : "300"}"
  frameborder="0"
  style="border: none; max-width: 400px;"
  title="CounterCart Impact Counter"
></iframe>`;

  const jsCode = `<div id="countercart-embed"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '${style === "minimal" ? "120" : "300"}';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.maxWidth = '400px';
    iframe.title = 'CounterCart Impact Counter';
    document.getElementById('countercart-embed').appendChild(iframe);
  })();
</script>`;

  const handleCopy = async (type: "iframe" | "js") => {
    const code = type === "iframe" ? iframeCode : jsCode;
    await navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Embed on Your Site
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="style-select">Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as EmbedStyle)}>
              <SelectTrigger id="style-select">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme-select">Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as EmbedTheme)}>
              <SelectTrigger id="theme-select">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div
            className={cn(
              "border-2 border-primary p-4 overflow-hidden",
              theme === "dark" ? "bg-[#0A0A0A]" : "bg-[#F0EBE0]"
            )}
          >
            <iframe
              src={embedUrl}
              width="100%"
              height={style === "minimal" ? "120" : "300"}
              frameBorder="0"
              style={{ border: "none", maxWidth: "400px" }}
              title="CounterCart Impact Counter Preview"
            />
          </div>
        </div>

        {/* iFrame Code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>iFrame Embed</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy("iframe")}
              className="h-8"
            >
              {copied === "iframe" ? (
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
          <pre className="bg-muted p-4 text-xs overflow-x-auto border-2 border-primary">
            <code>{iframeCode}</code>
          </pre>
        </div>

        {/* JavaScript Code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>JavaScript Embed</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy("js")}
              className="h-8"
            >
              {copied === "js" ? (
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
          <pre className="bg-muted p-4 text-xs overflow-x-auto border-2 border-primary">
            <code>{jsCode}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
