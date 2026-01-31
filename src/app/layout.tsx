import type { Metadata } from "next";
import { Suspense } from "react";
import { Bebas_Neue, IBM_Plex_Mono, Caveat } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FathomProvider } from "@/components/analytics/FathomProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/lib/env"; // Validate environment variables on startup
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-headline",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  weight: "600",
  variable: "--font-handwritten",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://countercart.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "CounterCart - Offset Your Purchases with Purpose",
    template: "%s | CounterCart",
  },
  description:
    "Automatically donate to causes you care about when you shop at businesses that don't align with your values. Turn every purchase into a force for good.",
  keywords: [
    "charity",
    "donations",
    "round up",
    "social impact",
    "ethical shopping",
    "cause-based giving",
    "automatic donations",
  ],
  authors: [{ name: "CounterCart" }],
  creator: "CounterCart",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "CounterCart",
    title: "CounterCart - Offset Your Purchases with Purpose",
    description:
      "Automatically donate to causes you care about when you shop at businesses that don't align with your values.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CounterCart - Turn purchases into donations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CounterCart - Offset Your Purchases with Purpose",
    description:
      "Automatically donate to causes you care about when you shop at businesses that don't align with your values.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bebasNeue.variable} ${ibmPlexMono.variable} ${caveat.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <FathomProvider>{children}</FathomProvider>
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
