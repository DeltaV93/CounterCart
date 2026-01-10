import { Progress } from "@/components/ui/progress";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Setting up your account</span>
          </div>
          <Progress value={33} className="h-2" />
        </div>
        {children}
      </div>
    </div>
  );
}
