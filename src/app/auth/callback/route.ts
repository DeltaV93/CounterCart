import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  // Use NEXT_PUBLIC_APP_URL in production to avoid proxy issues
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create or update user in our database
      const user = data.user;
      const name = user.user_metadata?.name || user.email?.split("@")[0] || "User";

      try {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name,
          },
          create: {
            id: user.id,
            email: user.email!,
            name,
          },
        });
      } catch (e) {
        logger.error("Error creating user in auth callback", { email: user.email }, e);
      }

      // Check if user has completed onboarding
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { onboardingComplete: true },
      });

      // Redirect to onboarding if not complete, otherwise to the intended destination
      const finalRedirect = dbUser?.onboardingComplete ? redirect : "/onboarding/causes";
      return NextResponse.redirect(`${baseUrl}${finalRedirect}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
