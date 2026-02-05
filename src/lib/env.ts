import { z } from "zod";

/**
 * Environment variable validation schema
 * This file validates all required environment variables at startup
 */

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  // Supabase Auth
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // Plaid
  PLAID_CLIENT_ID: z.string().min(1, "PLAID_CLIENT_ID is required"),
  PLAID_SECRET: z.string().min(1, "PLAID_SECRET is required"),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),

  // Every.org
  EVERYORG_API_KEY: z.string().optional(),
  EVERYORG_WEBHOOK_TOKEN: z.string().optional(),
  EVERYORG_WEBHOOK_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PREMIUM: z.string().optional(),

  // Security
  ENCRYPTION_SECRET: z.string().min(32, "ENCRYPTION_SECRET must be at least 32 characters"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  INTERNAL_API_TOKEN: z.string().min(32).optional(),

  // Backend service (optional - webhooks process inline if not configured)
  BACKEND_SERVICE_URL: z.string().url().optional(),

  // Error monitoring (Sentry)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_FATHOM_SITE_ID: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

function validateEnv(): ServerEnv {
  // Only validate on server-side
  if (typeof window !== "undefined") {
    return {} as ServerEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path}: ${issue.message}`;
    });

    const errorMessage = `Environment validation failed:\n${errors.join("\n")}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMessage);
    } else {
      console.warn(`\n⚠️  ${errorMessage}\n`);
    }
  }

  return result.data as ServerEnv;
}

export const env = validateEnv();

// Type-safe environment variable access
export function getEnv<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
  return env[key];
}
