"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          backgroundColor: "#f9fafb",
          color: "#1f2937",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "1.5rem",
              maxWidth: "400px",
            }}
          >
            An unexpected error occurred. Please try again, or contact support
            if the problem persists.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#e11d48",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
