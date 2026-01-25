# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CounterCart is a "round-up for charity" web app that matches purchases at specific businesses to counter-donations to related charitable causes. When users shop at businesses with questionable practices, the app automatically matches those transactions and suggests donations to opposing charities.

## Commands

### Next.js Frontend
```bash
npm run dev          # Start development server (port 3007)
npm run build        # Generate Prisma client + build Next.js
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database (no migration)
npm run db:migrate   # Create and run migrations
npm run db:seed      # Seed database with causes, charities, and mappings
npm run db:studio    # Open Prisma Studio GUI
```

### FastAPI Backend (background jobs)
```bash
cd backend
pip install -r requirements.txt   # Install dependencies
uvicorn app.main:app --reload     # Start development server (port 8000)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router (React 19)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Supabase Auth (email/password)
- **Banking**: Plaid API for transaction syncing
- **Donations**: Every.org API for nonprofit lookup and donation URLs
- **UI**: Tailwind CSS v4 + shadcn/ui components (in `src/components/ui/`)

### Key Flows

**Authentication Flow**:
- Supabase handles auth; middleware (`src/middleware.ts`) updates session cookies
- `src/lib/auth.ts` syncs Supabase users to Prisma User records on first access
- Protected routes redirect unauthenticated users to `/login`

**Transaction Matching Flow**:
1. Plaid webhook triggers transaction sync (`src/services/plaid.service.ts`)
2. `PlaidService.syncTransactions()` fetches new transactions via Plaid Sync API
3. Each transaction is normalized and passed to `MatchingService.processTransaction()`
4. Matching compares normalized merchant names against `BusinessMapping` patterns
5. If matched AND user has selected that cause, a `Donation` record is created

**Donation Calculation**:
- Round up transaction to nearest dollar (or $1 if already round)
- Multiply by user's `donationMultiplier` setting
- Check against user's `monthlyLimit`

### Data Model (key entities in `prisma/schema.prisma`)

- **User**: Core user with donation preferences (multiplier, monthly limit)
- **PlaidItem/BankAccount**: Connected bank accounts via Plaid
- **Cause**: Categories like "LGBTQ+ Rights", "Climate Action" (configured in `src/config/causes.ts`)
- **BusinessMapping**: Maps merchant patterns to causes (configured in `src/config/mappings.ts`)
- **Charity**: Nonprofits from Every.org, each linked to a cause
- **Transaction**: Raw transactions from Plaid
- **Donation**: Generated donations linked to matched transactions

### Route Structure

- `/` - Landing page
- `/(auth)/login`, `/(auth)/signup` - Authentication
- `/onboarding/*` - Setup flow (connect bank, select causes/charities)
- `/(dashboard)/*` - Main app (dashboard, transactions, donations, settings)
- `/api/plaid/*` - Plaid Link token creation and exchange
- `/api/donations/url` - Generate tracked donation URLs
- `/api/webhooks/plaid` - Plaid webhook handler (signature verified)
- `/api/webhooks/everyorg` - Every.org donation completion webhook
- `/api/webhooks/stripe` - Stripe subscription webhook

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment Variables

Required for full functionality:
- `DATABASE_URL`, `DIRECT_URL` - PostgreSQL connection strings
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase auth
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` - Plaid API (sandbox/development/production)
- `EVERYORG_API_KEY`, `EVERYORG_WEBHOOK_TOKEN`, `EVERYORG_WEBHOOK_SECRET` - Every.org API and webhooks
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PREMIUM` - Stripe subscriptions
- `ENCRYPTION_SECRET` - AES-256 encryption key for Plaid access tokens (generate with `openssl rand -base64 32`)

## Adding New Business Mappings

Edit `src/config/mappings.ts` to add new merchant-to-cause mappings, then run `npm run db:seed` to sync to database. The `merchantPattern` field is matched case-insensitively against normalized merchant names. Note: Mappings are cached for 5 minutes in `MatchingService`.

## Security

- **Plaid tokens**: Encrypted at rest with AES-256-GCM (`src/lib/encryption.ts`)
- **Webhook verification**: Plaid webhooks verified via JWT signature (`src/lib/plaid-webhook.ts`)
- **Rate limiting**: Applied to API routes via `src/lib/rate-limit.ts` (in-memory; use Redis for multi-instance)

## Logging

Structured JSON logging via `src/lib/logger.ts`. All server-side code uses the logger instead of console.log.

```typescript
import { logger } from "@/lib/logger";

logger.info("User logged in", { userId: "123" });
logger.error("Failed to process", { transactionId: "abc" }, error);

// Child logger with preset context
const log = logger.child({ requestId: "req-123" });
log.info("Processing request");
```

Log levels: `debug`, `info`, `warn`, `error`. Set via `LOG_LEVEL` env var (defaults to "info" in production).

## Analytics

Client-side analytics via [Fathom Analytics](https://usefathom.com) (`fathom-client`).

- **Page views**: Automatically tracked via `FathomProvider` in root layout
- **Custom events**: Use `track()` from `src/lib/analytics.ts`
- **Donation events**: Use `trackDonation()` which buckets amounts for privacy

```typescript
import { track, trackDonation, AnalyticsEvents } from "@/lib/analytics";

track(AnalyticsEvents.SIGNUP_COMPLETED);
trackDonation(AnalyticsEvents.DONATION_STARTED, 4.50); // Bucketed as "1_to_5"
```

Configure via `NEXT_PUBLIC_FATHOM_SITE_ID` env var.

## Deployment (Railway)

### Initial Setup

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init`
4. Link to existing project: `railway link`

### Environment Variables

Set these in Railway dashboard (Settings → Variables):

```
# Database (use Railway's PostgreSQL or external)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Plaid
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox  # or development/production

# Every.org
EVERYORG_API_KEY=xxx
EVERYORG_WEBHOOK_TOKEN=xxx
EVERYORG_WEBHOOK_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
STRIPE_PRICE_ID_PREMIUM=xxx

# Security
ENCRYPTION_SECRET=xxx  # openssl rand -base64 32

# App
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### Deploy

```bash
# Deploy from CLI
railway up

# Or connect GitHub repo in Railway dashboard for auto-deploy
```

### Database Setup

If using Railway PostgreSQL:
1. Add PostgreSQL service in Railway dashboard
2. Copy `DATABASE_URL` from the service variables
3. Run migrations: `railway run npm run db:migrate`
4. Seed data: `railway run npm run db:seed`

### Webhook URLs

Update these in respective dashboards after deployment:
- Plaid: `https://your-app.railway.app/api/webhooks/plaid`
- Every.org: Contact support@every.org with `https://your-app.railway.app/api/webhooks/everyorg`
- Stripe: `https://your-app.railway.app/api/webhooks/stripe`
