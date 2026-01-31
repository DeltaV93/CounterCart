"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Onboarding error:", error);
  }, [error]);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-xl">Setup Error</CardTitle>
        <CardDescription>
          We ran into an issue during setup. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md font-mono overflow-auto max-h-32">
            {error.message}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
        <Button onClick={reset} className="flex-1">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </CardFooter>
    </Card>
  );
}
