import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  // Get or create the user in our database
  let dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  // If authenticated but no DB record, create one
  if (!dbUser) {
    try {
      dbUser = await prisma.user.create({
        data: {
          id: user.id, // Use Supabase user ID for consistency
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        },
      });
    } catch (error) {
      // Handle race condition where user was created between check and insert
      console.error("Error creating user:", error);
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
    }
  }

  return dbUser;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
