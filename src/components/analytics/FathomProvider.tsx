"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { load, trackPageview } from "fathom-client";

const FATHOM_SITE_ID = process.env.NEXT_PUBLIC_FATHOM_SITE_ID;

export function FathomProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!FATHOM_SITE_ID) {
      console.warn("Fathom Analytics: NEXT_PUBLIC_FATHOM_SITE_ID not configured");
      return;
    }

    load(FATHOM_SITE_ID, {
      auto: false, // We'll track manually on route changes
      includedDomains: [
        "countercart.app", // Production domain - update as needed
        "localhost",
      ],
    });
  }, []);

  useEffect(() => {
    if (!FATHOM_SITE_ID) return;

    // Track page view on route change
    trackPageview();
  }, [pathname, searchParams]);

  return <>{children}</>;
}
