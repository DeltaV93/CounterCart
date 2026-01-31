import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OnboardingLoading() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </CardContent>
    </Card>
  );
}
