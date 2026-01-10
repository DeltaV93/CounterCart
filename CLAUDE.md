# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CounterCart is a "round-up for charity" web app that matches purchases at specific businesses to counter-donations to related charitable causes. When users shop at businesses with questionable practices, the app automatically matches those transactions and suggests donations to opposing charities.

## Commands

```bash
npm run dev          # Start development server (Next.js)
npm run build        # Generate Prisma client + build Next.js
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database (no migration)
npm run db:migrate   # Create and run migrations
npm run db:seed      # Seed database with causes, charities, and mappings
npm run db:studio    # Open Prisma Studio GUI
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
- `/api/webhooks/plaid` - Plaid webhook handler

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment Variables

Required for full functionality:
- `DATABASE_URL`, `DIRECT_URL` - PostgreSQL connection strings
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase auth
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` - Plaid API (sandbox/development/production)
- `EVERYORG_API_KEY` - Every.org nonprofit API

## Adding New Business Mappings

Edit `src/config/mappings.ts` to add new merchant-to-cause mappings, then run `npm run db:seed` to sync to database. The `merchantPattern` field is matched case-insensitively against normalized merchant names.
