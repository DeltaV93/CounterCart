# CounterCart Feature Completion Plan

## Status: All Features Complete ✅

All planned features have been implemented. This document serves as a reference for the architecture and decisions made.

---

## Revenue Strategy: Subscription Model

**Primary revenue comes from Premium subscriptions ($4.99/mo), not from donation fees.**

### Why Subscription Model

1. **Legally Clean** - No 501(c)(3) status required
2. **Simple to Explain** - Users pay for the service, 100% of donations go to charity
3. **No Compliance Complexity** - Change API handles all nonprofit/tax receipt compliance
4. **Predictable Revenue** - Monthly recurring vs. variable transaction fees

### Feature Tiers

| Feature | Free | Premium ($4.99/mo) |
|---------|------|-------------------|
| Transaction matching | ✅ | ✅ |
| Manual donations (Every.org) | ✅ | ✅ |
| Auto-donations (ACH + Change API) | ❌ | ✅ |
| Causes limit | 3 | Unlimited |
| Monthly donation limit | $25 | $500 |
| Tax summary reports | Basic | Detailed PDF |

### Why NOT Per-Transaction Fees

- Taking a cut from donations requires careful legal structuring
- Must clearly separate "service fee" from "donation amount"
- Users expect 100% to go to charity
- Adds complexity to tax receipts and disclosures

---

## Phase 1: Critical Fixes ✅

| Feature | Status | Files |
|---------|--------|-------|
| 1.1 Footer Links | ✅ | `src/app/(legal)/privacy/page.tsx`, `terms/page.tsx`, `faq/page.tsx`, `layout.tsx` |
| 1.2 Mobile Navigation | ✅ | `src/components/MobileNav.tsx`, dashboard layout |
| 1.3 Account Deletion (GDPR) | ✅ | `src/app/api/user/delete/route.ts`, settings page |
| 1.4 Data Export (GDPR) | ✅ | `src/app/api/user/export/route.ts`, settings page |
| 1.5 Onboarding Progress Bar | ✅ | `src/app/onboarding/layout.tsx` (dynamic based on route) |

---

## Phase 2: Advertised Features ✅

| Feature | Status | Files |
|---------|--------|-------|
| 2.1 Tax Export (Premium) | ✅ | `src/app/api/user/tax-summary/route.ts`, `src/app/(dashboard)/tax-summary/page.tsx` |
| 2.2 Bank Account Management | ✅ | `src/app/api/user/bank-accounts/route.ts`, `src/components/BankAccountList.tsx` |

---

## Phase 3: UX Improvements ✅

| Feature | Status | Files |
|---------|--------|-------|
| 3.1 Transaction Filters & Search | ✅ | `src/components/TransactionFilters.tsx`, transactions API with query params |
| 3.2 Notification Preferences | ✅ | `src/components/NotificationPreferences.tsx`, User model fields |
| 3.3 Dashboard Charts | ✅ | `src/components/DashboardCharts.tsx` (recharts: bar + pie charts) |
| 3.4 Donation Management | ✅ | `src/app/api/donations/[id]/cancel/route.ts`, cancel UI in donations page |

---

## Phase 4: Polish ✅

| Feature | Status | Files |
|---------|--------|-------|
| 4.1 Dark Mode | ✅ | `src/components/ThemeToggle.tsx`, `ThemeProvider.tsx`, next-themes |
| 4.2 Empty States | ✅ | `src/components/EmptyState.tsx`, used across dashboard pages |
| 4.3 Loading States | ✅ | `loading.tsx` files for all dashboard routes with skeletons |

---

## Phase 5: Auto-Donations ✅

### Implementation

| Component | Files |
|-----------|-------|
| Plaid Auth | `src/lib/plaid.ts` (Products.Auth), `src/services/plaid.service.ts` |
| Stripe ACH | `src/lib/stripe-ach.ts`, `src/app/api/donations/setup-ach/route.ts` |
| Change API | `src/lib/change.ts`, `src/app/api/webhooks/change/route.ts` |
| ACH Consent UI | `src/app/onboarding/ach-authorization/page.tsx`, `src/components/ach/MandateAgreement.tsx` |
| Backend Processing | `backend/app/jobs/process_donations.py`, `backend/app/services/change_service.py` |
| Webhook Handlers | `src/app/api/webhooks/stripe/route.ts` (ACH events) |

### User Flow

1. Premium user enables auto-donate in settings
2. Connects bank via Plaid (with Auth)
3. Signs ACH authorization mandate
4. Transactions matched throughout week
5. Sunday: Stripe ACH debits bank, Change API distributes to charities
6. User receives tax receipts from Change

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Plaid
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox  # or development/production

# Every.org (manual donations)
EVERYORG_API_KEY=xxx
EVERYORG_WEBHOOK_TOKEN=xxx
EVERYORG_WEBHOOK_SECRET=xxx

# Stripe (subscriptions + ACH)
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
STRIPE_PRICE_ID_PREMIUM=xxx

# Change API (auto-donations)
CHANGE_API_KEY=sk_xxx
CHANGE_WEBHOOK_SECRET=whsec_xxx

# Security
ENCRYPTION_SECRET=xxx  # openssl rand -base64 32

# App
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

---

## Key Dependencies

```json
{
  "next": "16.x",
  "react": "19.x",
  "@prisma/client": "5.x",
  "stripe": "latest",
  "plaid": "latest",
  "recharts": "3.x",
  "next-themes": "latest",
  "@radix-ui/*": "latest"
}
```

---

## Next Steps

1. **Testing** - End-to-end testing of auto-donation flow
2. **Change API Setup** - Sign up at getchange.io and get production credentials
3. **Plaid Production** - Apply for production access
4. **Deploy** - Railway deployment with all environment variables
5. **Launch** - Marketing and user acquisition
