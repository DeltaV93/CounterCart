"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { track, AnalyticsEvents } from "@/lib/analytics";

interface PlaidLinkButtonProps {
  onSuccess: (institutionName: string, accountCount: number) => void;
  onError?: (error: string) => void;
}

export function PlaidLinkButton({ onSuccess, onError }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch link token on mount
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await fetch("/api/plaid/create-link-token", {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create link token");
        }

        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize bank connection";
        setError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkToken();
  }, [onError]);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setIsExchanging(true);
      setError(null);

      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            metadata: {
              institution: metadata.institution,
              accounts: metadata.accounts,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to connect bank account");
        }

        const data = await response.json();

        // Track successful connection
        track(AnalyticsEvents.ONBOARDING_BANK_CONNECTED);

        onSuccess(data.institution, data.accounts);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect bank account";
        setError(message);
        onError?.(message);
      } finally {
        setIsExchanging(false);
      }
    },
    [onSuccess, onError]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (err) => {
      if (err) {
        const message = err.display_message || err.error_message || "Connection was cancelled";
        setError(message);
        onError?.(message);
      }
    },
  });

  const handleClick = () => {
    setError(null);
    open();
  };

  if (error && !linkToken) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="w-full"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Button
        className="w-full"
        size="lg"
        onClick={handleClick}
        disabled={!ready || isLoading || isExchanging}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Initializing...
          </>
        ) : isExchanging ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Building2 className="mr-2 h-4 w-4" />
            Connect bank account
          </>
        )}
      </Button>
    </div>
  );
}
