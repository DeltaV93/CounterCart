import type { Metadata } from "next";
import { Suspense } from "react";
import { Bebas_Neue, IBM_Plex_Mono, Caveat } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FathomProvider } from "@/components/analytics/FathomProvider";
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

export const metadata: Metadata = {
  title: "CounterCart - Offset Your Purchases with Purpose",
  description:
    "Automatically donate to causes you care about when you shop at businesses that don't align with your values. Turn every purchase into a force for good.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bebasNeue.variable} ${ibmPlexMono.variable} ${caveat.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <FathomProvider>{children}</FathomProvider>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
