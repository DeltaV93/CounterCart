# CounterCart Feature Completion Plan

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

## Phase 1: Critical Fixes (Legal & Broken UX)

### 1.1 Fix Dead Footer Links
**Files to create:**
- `/src/app/(legal)/privacy/page.tsx` - Privacy Policy page
- `/src/app/(legal)/terms/page.tsx` - Terms of Service page
- `/src/app/(legal)/faq/page.tsx` - FAQ page
- `/src/app/(legal)/layout.tsx` - Simple layout for legal pages

**Files to modify:**
- `/src/app/page.tsx` - Update footer links from "#" to actual routes

---

### 1.2 Mobile Navigation
**Files to create:**
- `/src/components/MobileNav.tsx` - Slide-out mobile menu with all nav items

**Files to modify:**
- `/src/app/(dashboard)/layout.tsx` - Add MobileNav component, show hamburger menu on mobile

---

### 1.3 Account Deletion (GDPR)
**Files to create:**
- `/src/app/api/user/delete/route.ts` - DELETE endpoint that:
  - Disconnects Plaid items
  - Cancels Stripe subscription
  - Deletes all user data (cascading)
  - Signs out user from Supabase

**Files to modify:**
- `/src/app/(dashboard)/settings/page.tsx` - Add "Delete Account" section with confirmation dialog

---

### 1.4 Data Export (GDPR)
**Files to create:**
- `/src/app/api/user/export/route.ts` - GET endpoint returning JSON/CSV of:
  - User profile
  - Transactions
  - Donations
  - Connected accounts (metadata only)
  - Cause/charity selections

**Files to modify:**
- `/src/app/(dashboard)/settings/page.tsx` - Add "Export My Data" button

---

### 1.5 Fix Onboarding Progress Bar
**Files to modify:**
- `/src/app/onboarding/layout.tsx` - Make progress dynamic based on current route
  - `/onboarding/causes` = 25%
  - `/onboarding/charities` = 50%
  - `/onboarding/connect` = 75%
  - `/onboarding/preferences` = 100%

---

## Phase 2: Advertised Features

### 2.1 Tax Export (Premium)
**Files to create:**
- `/src/app/api/user/tax-summary/route.ts` - GET endpoint generating tax summary:
  - Total donations by year
  - Breakdown by charity (with EIN if available)
  - PDF generation using @react-pdf/renderer

- `/src/app/(dashboard)/tax-summary/page.tsx` - Tax summary page with:
  - Year selector
  - Summary table
  - Download PDF button
  - Premium gate for free users

**Files to modify:**
- `/src/app/(dashboard)/layout.tsx` - Add nav link to tax summary

---

### 2.2 Bank Account Management
**Files to create:**
- `/src/app/api/user/bank-accounts/route.ts` - GET connected accounts, DELETE to disconnect
- `/src/components/BankAccountList.tsx` - List of connected accounts with status and disconnect button

**Files to modify:**
- `/src/app/(dashboard)/settings/page.tsx` - Replace generic bank card with BankAccountList component

---

## Phase 3: UX Improvements

### 3.1 Transaction Filters & Search
**Files to create:**
- `/src/components/TransactionFilters.tsx` - Filter bar with:
  - Search input (merchant name)
  - Date range picker
  - Status filter (matched/unmatched)
  - Sort options

**Files to modify:**
- `/src/app/(dashboard)/transactions/page.tsx` - Add filters, update API call with query params
- `/src/app/api/transactions/route.ts` - Add query param support for filtering/sorting

---

### 3.2 Notification Preferences
**Files to create:**
- `/src/components/NotificationPreferences.tsx` - Toggle switches for:
  - Weekly summary emails
  - Donation confirmations
  - Payment alerts
  - Bank connection alerts

**Files to modify:**
- `prisma/schema.prisma` - Add notification preference fields to User model
- `/src/app/(dashboard)/settings/page.tsx` - Add notification preferences section
- `/src/lib/email.ts` - Check user preferences before sending

---

### 3.3 Dashboard Charts & Impact
**Files to create:**
- `/src/components/DonationChart.tsx` - Monthly donation chart (use recharts or chart.js)
- `/src/components/CauseBreakdown.tsx` - Pie chart of donations by cause
- `/src/components/ImpactSummary.tsx` - Total impact stats

**Dependencies to add:**
- `recharts` for charts

**Files to modify:**
- `/src/app/(dashboard)/dashboard/page.tsx` - Add charts section below summary cards

---

### 3.4 Donation Management
**Files to create:**
- `/src/app/api/donations/[id]/route.ts` - DELETE to cancel pending donation

**Files to modify:**
- `/src/app/(dashboard)/donations/page.tsx` - Add cancel button to pending donations

---

## Phase 4: Polish

### 4.1 Dark Mode
**Files to create:**
- `/src/components/ThemeToggle.tsx` - Theme switcher component

**Files to modify:**
- `/src/app/layout.tsx` - Wrap with ThemeProvider from next-themes
- `/src/app/(dashboard)/layout.tsx` - Add ThemeToggle to header

---

### 4.2 Empty States
**Files to create:**
- `/src/components/EmptyState.tsx` - Reusable empty state with icon, title, description, action

**Files to modify:**
- Update all pages with empty states to use consistent component

---

### 4.3 Loading States
**Files to modify:**
- Add Suspense boundaries and loading.tsx to remaining routes:
  - `/src/app/(dashboard)/transactions/loading.tsx`
  - `/src/app/(dashboard)/donations/loading.tsx`
  - `/src/app/(dashboard)/charities/loading.tsx`

---

## Phase 5: Auto-Donations (Implemented)

### 5.1 Plaid Auth Integration
- Added `Products.Auth` to Plaid Link for bank account verification
- `src/services/plaid.service.ts` - Added `getAuthData()` and `createStripeBankAccountToken()`

### 5.2 Stripe ACH Integration
- `src/lib/stripe-ach.ts` - ACH payment helpers
- `src/app/api/donations/setup-ach/route.ts` - ACH setup endpoint

### 5.3 Change API Integration
- `src/lib/change.ts` - Change API client for programmatic donations
- `src/app/api/webhooks/change/route.ts` - Donation status webhooks
- `backend/app/services/change_service.py` - Backend Change service
- `backend/app/services/stripe_service.py` - Backend Stripe ACH service

### 5.4 ACH Consent UI
- `src/app/onboarding/ach-authorization/page.tsx` - ACH setup flow
- `src/components/ach/MandateAgreement.tsx` - Legal mandate component

### 5.5 Auto-Donation Processing
- `backend/app/jobs/process_donations.py` - Added ACH + Change processing functions
- `src/app/api/webhooks/stripe/route.ts` - Added ACH payment event handlers

### User Flow
1. Premium user enables auto-donate in settings
2. Connects bank via Plaid (with Auth)
3. Signs ACH authorization mandate
4. Transactions matched throughout week
5. Sunday: Stripe ACH debits bank, Change API distributes to charities
6. User receives tax receipts from Change

---

## Implementation Order

```
Week 1: Phase 1 (Critical)
├── Day 1: Footer links + legal pages
├── Day 2: Mobile navigation
├── Day 3: Account deletion
├── Day 4: Data export
└── Day 5: Onboarding progress fix

Week 2: Phase 2 (Advertised Features)
├── Day 1-2: Tax export with PDF
├── Day 3-4: Bank account management
└── Day 5: Testing & fixes

Week 3: Phase 3 (UX)
├── Day 1-2: Transaction filters
├── Day 3: Notification preferences
├── Day 4-5: Dashboard charts

Week 4: Phase 4 (Polish)
├── Day 1: Dark mode
├── Day 2: Empty states
├── Day 3: Loading states
├── Day 4-5: Final testing & bug fixes
```

## New Dependencies

```bash
npm install @react-pdf/renderer recharts
```

## Database Migrations Needed

```prisma
// Add to User model
model User {
  // ... existing fields

  // Notification preferences
  emailWeeklySummary    Boolean @default(true)
  emailDonationConfirm  Boolean @default(true)
  emailPaymentAlerts    Boolean @default(true)
  emailBankAlerts       Boolean @default(true)
}
```

## New Environment Variables

```env
# Change API (for auto-donations)
CHANGE_API_KEY=sk_xxx
CHANGE_WEBHOOK_SECRET=whsec_xxx
```

---

## Files Summary

### New Files (19)
```
src/app/(legal)/layout.tsx
src/app/(legal)/privacy/page.tsx
src/app/(legal)/terms/page.tsx
src/app/(legal)/faq/page.tsx
src/components/MobileNav.tsx
src/app/api/user/delete/route.ts
src/app/api/user/export/route.ts
src/app/api/user/tax-summary/route.ts
src/app/(dashboard)/tax-summary/page.tsx
src/app/api/user/bank-accounts/route.ts
src/components/BankAccountList.tsx
src/components/TransactionFilters.tsx
src/components/NotificationPreferences.tsx
src/components/DonationChart.tsx
src/components/CauseBreakdown.tsx
src/components/ImpactSummary.tsx
src/app/api/donations/[id]/route.ts
src/components/ThemeToggle.tsx
src/components/EmptyState.tsx
```

### Modified Files (12)
```
src/app/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/settings/page.tsx
src/app/onboarding/layout.tsx
src/app/(dashboard)/transactions/page.tsx
src/app/api/transactions/route.ts
src/app/(dashboard)/donations/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/layout.tsx
src/lib/email.ts
prisma/schema.prisma
package.json
```
