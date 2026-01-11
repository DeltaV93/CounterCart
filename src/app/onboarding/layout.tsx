import Link from "next/link";
import { Progress } from "@/components/ui/progress";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <span className="tracking-wider uppercase">Setting up your account</span>
          </div>
          <Progress value={33} />
        </div>
        {children}
      </div>
    </div>
  );
}
