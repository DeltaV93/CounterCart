"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";

const steps = [
  { path: "/onboarding/causes", label: "Select Causes", progress: 25 },
  { path: "/onboarding/charities", label: "Review Charities", progress: 50 },
  { path: "/onboarding/connect", label: "Connect Bank", progress: 75 },
  { path: "/onboarding/preferences", label: "Set Preferences", progress: 100 },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Find current step
  const currentStep = steps.find((step) => pathname === step.path);
  const progress = currentStep?.progress || 25;
  const currentStepIndex = steps.findIndex((step) => pathname === step.path);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary border-b-[3px] border-accent py-4 px-4">
        <div className="container mx-auto max-w-2xl">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-accent flex items-center justify-center text-primary">
              ↺
            </div>
            <span className="headline text-primary-foreground text-xl tracking-wider">
              COUNTERCART
            </span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <span className="tracking-wider uppercase">
              {currentStep?.label || "Setting up your account"}
            </span>
            <span>
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Step indicators */}
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={step.path}
                className={`text-xs ${
                  index <= currentStepIndex
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
