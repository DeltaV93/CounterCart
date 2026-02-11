# Auto-Donations Feature PRD

## Product Requirements Document
**Feature:** Acorns-Style Automatic Donations
**Version:** 1.0
**Date:** February 2026
**Status:** Planning Complete

---

## Executive Summary

CounterCart currently requires users to manually approve each donation by clicking through to Every.org. This PRD outlines the implementation of an Acorns-style auto-donation system where users set their preferences once, and donations happen automatically on a weekly basis.

### Key Decision
After evaluating multiple approaches, we chose **Stripe ACH + Change API** as the implementation path. This provides true automatic donations without requiring CounterCart to become a 501(c)(3) or handle complex compliance requirements.

---

## Problem Statement

### Current State
1. User shops at a matched business
2. Transaction syncs via Plaid
3. Pending donation created in dashboard
4. **User must manually click "Donate"**
5. **User redirected to Every.org**
6. **User enters payment info on Every.org**
7. **User confirms donation**
8. Webhook confirms completion

**Pain Points:**
- High friction reduces donation completion rates
- Users forget to complete pending donations
- Manual process doesn't match the "set it and forget it" expectation
- Competitors (Acorns, Stash) offer seamless automatic transfers

### Desired State
1. User connects bank and authorizes ACH (one-time)
2. User sets donation preferences (triggers, limits)
3. Transactions automatically matched throughout week
4. **Donations automatically processed weekly**
5. User receives confirmation email
6. Funds distributed to charities via API

---

## User Stories

### Epic: Automatic Donation Setup

**US-1: Bank Account Authorization**
> As a user, I want to authorize automatic debits from my bank account so that I don't have to manually approve each donation.

**Acceptance Criteria:**
- User can connect bank via Plaid Link (with Auth)
- User presented with clear ACH authorization terms
- User signs electronic mandate (checkbox + date)
- Bank account linked to Stripe for future ACH debits
- User can revoke authorization at any time

---

**US-2: Donation Preferences**
> As a user, I want to set my donation preferences once and have them apply automatically.

**Acceptance Criteria:**
- User can set donation multiplier (1x-5x round-up)
- User can set monthly donation limit
- User can select which causes trigger donations
- User can enable/disable auto-donate toggle
- Settings persist and apply to all future transactions

---

**US-3: Weekly Donation Processing**
> As a user, I want my donations to be processed automatically each week without my intervention.

**Acceptance Criteria:**
- Donations batched weekly (Sunday)
- Single ACH debit for total weekly amount
- Individual donations distributed to respective charities
- User receives email summary of processed donations
- Failed payments trigger notification and retry

---

**US-4: Transparency & Control**
> As a user, I want visibility into my automatic donations and the ability to pause or cancel at any time.

**Acceptance Criteria:**
- Dashboard shows pending donations for current week
- Dashboard shows completed donation history
- User can pause auto-donations (temporary)
- User can cancel auto-donations (permanent)
- User can view tax receipts from Change

---

### Epic: Charity Distribution

**US-5: Automatic Charity Payments**
> As the system, I need to distribute collected funds to charities without manual intervention.

**Acceptance Criteria:**
- Funds distributed via Change API after ACH settles
- Each charity receives correct donation amount
- Donation tracked with user ID and transaction reference
- Change handles tax receipts and compliance
- Failed distributions logged and retried

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Connect Bank │  │ Set Prefs    │  │ View Dashboard│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│  /onboarding/ach-authorization    /settings    /donations       │
└─────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTES                                 │
│  /api/donations/setup-ach    /api/user/settings    /api/donations│
└─────────────────────────────────────────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│     PLAID        │              │   POSTGRESQL     │
│  - Transactions  │              │   - Users        │
│  - Auth          │              │   - Donations    │
│  - Bank linking  │              │   - Batches      │
└────────┬─────────┘              └──────────────────┘
         │                                   ▲
         ▼                                   │
┌──────────────────┐                         │
│     STRIPE       │                         │
│  - ACH debits    │                         │
│  - Webhooks      │─────────────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   CHANGE API     │
│  - Donations     │
│  - Disbursements │
│  - Tax receipts  │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│   NONPROFITS     │
│  (1.3M+ orgs)    │
└──────────────────┘
```

### Data Flow: Weekly Donation Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEEKLY BATCH JOB (Sunday 8 PM UTC)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. QUERY: Get users where autoDonateEnabled=true AND achEnabled │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FOR EACH USER: Get pending donations for the week            │
│    - Calculate total amount (sum of all donation amounts)       │
│    - Check against monthly limit                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CREATE: Stripe PaymentIntent with ACH payment method         │
│    - payment_method_types: ['us_bank_account']                  │
│    - amount: total weekly donations                             │
│    - confirm: true                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. UPDATE: Batch status = 'PROCESSING'                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
           ┌──────────────────┴──────────────────┐
           │      WAIT FOR STRIPE WEBHOOK        │
           │   (ACH takes 3-5 business days)     │
           └──────────────────┬──────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────┐                   ┌───────────────────┐
│ payment_intent.   │                   │ payment_intent.   │
│ succeeded         │                   │ payment_failed    │
└────────┬──────────┘                   └────────┬──────────┘
         │                                       │
         ▼                                       ▼
┌───────────────────┐                   ┌───────────────────┐
│ 5. FOR EACH       │                   │ 5. Mark batch     │
│    DONATION:      │                   │    FAILED         │
│    - Call Change  │                   │    - Notify user  │
│    - Create       │                   │    - Log error    │
│      donation     │                   │    - Schedule     │
└────────┬──────────┘                   │      retry        │
         │                              └───────────────────┘
         ▼
┌───────────────────┐
│ 6. UPDATE:        │
│    - Donation     │
│      status =     │
│      COMPLETED    │
│    - Batch status │
│      = COMPLETED  │
│    - Send email   │
└───────────────────┘
```

---

## Database Design

### Schema Changes

```prisma
// ============================================
// MODIFIED MODELS
// ============================================

model User {
  // Existing fields...
  id                    String    @id @default(cuid())
  email                 String    @unique
  name                  String?

  // Existing donation settings
  autoDonateEnabled     Boolean   @default(false)
  donationMultiplier    Decimal   @default(1.0)
  monthlyLimit          Decimal?

  // NEW: Stripe & Change integration
  stripeCustomerId      String?   @unique
  changeCustomerId      String?   @unique  // NEW

  // Relations
  bankAccounts          BankAccount[]
  donations             Donation[]
  donationBatches       DonationBatch[]
}

model BankAccount {
  // Existing fields...
  id                    String    @id @default(cuid())
  userId                String
  plaidItemId           String
  plaidAccountId        String
  name                  String
  mask                  String?
  type                  String
  subtype               String?

  // NEW: ACH authorization fields
  stripePaymentMethodId String?   @unique  // NEW: Stripe bank account token
  achEnabled            Boolean   @default(false)  // NEW
  achAuthorizedAt       DateTime?  // NEW: When user signed mandate
  achMandateText        String?    // NEW: Store signed mandate for records

  // Relations
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plaidItem             PlaidItem @relation(fields: [plaidItemId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Charity {
  // Existing fields...
  id                    String    @id @default(cuid())
  name                  String
  everyOrgSlug          String    @unique
  ein                   String?

  // NEW: Change API integration
  changeNonprofitId     String?   @unique  // NEW: Change.io nonprofit ID

  // Relations
  donations             Donation[]
}

model Donation {
  // Existing fields...
  id                    String    @id @default(cuid())
  userId                String
  charityId             String
  amount                Decimal
  status                DonationStatus

  // Existing Every.org tracking
  everyOrgId            String?

  // NEW: Change API tracking
  changeId              String?   @unique  // NEW: Change donation ID
  changeDisbursedAt     DateTime?  // NEW: When Change sent to charity

  // NEW: ACH payment tracking
  stripePaymentIntentId String?   // NEW: Link to Stripe ACH payment

  // Relations
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  charity               Charity   @relation(fields: [charityId], references: [id])
  batch                 DonationBatch? @relation(fields: [batchId], references: [id])
}

model DonationBatch {
  // Existing fields...
  id                    String    @id @default(cuid())
  userId                String
  weekOf                DateTime  @db.Date
  totalAmount           Decimal
  status                DonationBatchStatus

  // NEW: Payment tracking
  stripePaymentIntentId String?   @unique  // NEW
  achInitiatedAt        DateTime?  // NEW
  achSettledAt          DateTime?  // NEW
  failureReason         String?    // NEW: If ACH failed
  retryCount            Int        @default(0)  // NEW

  // Relations
  user                  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  donations             Donation[]
}

// ============================================
// UPDATED ENUMS
// ============================================

enum DonationStatus {
  PENDING      // Created, awaiting batch
  BATCHED      // Added to weekly batch
  PROCESSING   // ACH initiated
  COMPLETED    // ACH settled + Change donation sent
  FAILED       // Payment failed
  REFUNDED     // User requested refund
  CANCELLED    // User cancelled before processing
}

enum DonationBatchStatus {
  PENDING      // Collecting donations for the week
  READY        // Week ended, ready to process
  PROCESSING   // ACH initiated, waiting for settlement
  COMPLETED    // All donations distributed
  FAILED       // ACH failed
  PARTIAL      // Some donations failed, others succeeded
}
```

### Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                              USER                                 │
├──────────────────────────────────────────────────────────────────┤
│ id                    │ cuid                                      │
│ email                 │ unique                                    │
│ stripeCustomerId      │ unique, nullable (NEW)                    │
│ changeCustomerId      │ unique, nullable (NEW)                    │
│ autoDonateEnabled     │ boolean, default false                    │
│ donationMultiplier    │ decimal, default 1.0                      │
│ monthlyLimit          │ decimal, nullable                         │
└───────────────────────┴──────────────────────────────────────────┘
         │                                        │
         │ 1:N                                    │ 1:N
         ▼                                        ▼
┌─────────────────────────┐            ┌─────────────────────────┐
│      BANK_ACCOUNT       │            │    DONATION_BATCH       │
├─────────────────────────┤            ├─────────────────────────┤
│ id                      │            │ id                      │
│ userId (FK)             │            │ userId (FK)             │
│ stripePaymentMethodId   │ (NEW)      │ weekOf                  │
│ achEnabled              │ (NEW)      │ totalAmount             │
│ achAuthorizedAt         │ (NEW)      │ status                  │
│ achMandateText          │ (NEW)      │ stripePaymentIntentId   │ (NEW)
└─────────────────────────┘            │ achInitiatedAt          │ (NEW)
                                       │ achSettledAt            │ (NEW)
                                       └────────────┬────────────┘
                                                    │
                                                    │ 1:N
                                                    ▼
┌─────────────────────────┐            ┌─────────────────────────┐
│        CHARITY          │            │       DONATION          │
├─────────────────────────┤            ├─────────────────────────┤
│ id                      │◄───────────│ charityId (FK)          │
│ name                    │            │ userId (FK)             │
│ everyOrgSlug            │            │ batchId (FK)            │
│ changeNonprofitId       │ (NEW)      │ amount                  │
└─────────────────────────┘            │ status                  │
                                       │ changeId                │ (NEW)
                                       │ stripePaymentIntentId   │ (NEW)
                                       └─────────────────────────┘
```

---

## API Design

### New Endpoints

#### POST /api/donations/setup-ach
**Purpose:** Link Plaid bank account to Stripe for ACH debits

**Request:**
```typescript
{
  bankAccountId: string;  // CounterCart bank account ID
}
```

**Response:**
```typescript
{
  success: boolean;
  stripePaymentMethodId: string;
  requiresMandate: boolean;
}
```

**Flow:**
1. Get Plaid access token for the bank account
2. Call Plaid `/processor/stripe/bank_account_token/create`
3. Create/update Stripe PaymentMethod
4. Attach to Stripe Customer
5. Update BankAccount record

---

#### POST /api/donations/authorize-ach
**Purpose:** Record user's ACH authorization (mandate)

**Request:**
```typescript
{
  bankAccountId: string;
  mandateAccepted: boolean;
  signature: string;  // Digital signature or checkbox confirmation
}
```

**Response:**
```typescript
{
  success: boolean;
  achEnabled: boolean;
  achAuthorizedAt: string;  // ISO date
}
```

---

#### POST /api/donations/process-batch
**Purpose:** Manually trigger batch processing (for testing/admin)

**Request:**
```typescript
{
  batchId?: string;  // Specific batch, or all READY batches
}
```

**Response:**
```typescript
{
  processed: number;
  failed: number;
  batches: Array<{
    id: string;
    status: string;
    totalAmount: number;
    donationCount: number;
  }>;
}
```

---

#### POST /api/webhooks/change
**Purpose:** Receive donation status updates from Change

**Payload (from Change):**
```typescript
{
  event: 'donation.completed' | 'donation.failed';
  donation: {
    id: string;
    nonprofit_id: string;
    amount: number;
    status: string;
    metadata: {
      user_id: string;
      donation_id: string;
    };
  };
}
```

---

### Updated Stripe Webhook Events

Add handling for ACH-specific events:

```typescript
// src/app/api/webhooks/stripe/route.ts

switch (event.type) {
  // Existing subscription events...

  // NEW: ACH payment events
  case 'payment_intent.processing':
    // ACH initiated, waiting for bank
    await handleAchProcessing(event.data.object);
    break;

  case 'payment_intent.succeeded':
    // ACH settled successfully
    await handleAchSuccess(event.data.object);
    break;

  case 'payment_intent.payment_failed':
    // ACH failed (insufficient funds, etc.)
    await handleAchFailure(event.data.object);
    break;
}
```

---

## User Interface

### ACH Authorization Page

**Route:** `/onboarding/ach-authorization`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                           [X]   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            AUTHORIZE AUTOMATIC DONATIONS                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  You're setting up automatic weekly donations from:             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🏦 Chase Checking ••••4532                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ACH DEBIT AUTHORIZATION                                        │
│                                                                 │
│  By checking the box below, you authorize CounterCart to:       │
│                                                                 │
│  • Debit your bank account weekly for donation amounts          │
│  • Donations calculated as: round-up × your multiplier          │
│  • Maximum monthly limit: $100 (adjustable in settings)         │
│  • Debits occur every Sunday for the prior week                 │
│                                                                 │
│  You can cancel this authorization at any time from your        │
│  settings page. Cancellation takes effect immediately.          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [✓] I authorize CounterCart to debit my account as      │    │
│  │     described above.                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               [ AUTHORIZE & ENABLE ]                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  By clicking "Authorize & Enable" you agree to our              │
│  Terms of Service and ACH Authorization Agreement.              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Settings Page Addition

**Route:** `/settings` (update existing)

```
┌─────────────────────────────────────────────────────────────────┐
│  AUTO-DONATIONS                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Automatic Weekly Donations                    [ ON  ◉ OFF ]    │
│  Donations processed every Sunday via ACH                       │
│                                                                 │
│  Payment Account                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🏦 Chase Checking ••••4532              [Change Account] │  │
│  │     Authorized on Feb 1, 2026                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [ Revoke ACH Authorization ]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Donations Dashboard Update

**Route:** `/donations` (update existing)

```
┌─────────────────────────────────────────────────────────────────┐
│  THIS WEEK'S DONATIONS                              Processing  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Week of Feb 3-9, 2026                                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Starbucks → Environmental Defense Fund         $2.45     │  │
│  │  Amazon → Rainforest Alliance                   $3.12     │  │
│  │  Chick-fil-A → Trevor Project                   $1.88     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  TOTAL THIS WEEK                                   $7.45        │
│  Processing Sunday, Feb 9 at 8 PM                               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  COMPLETED                                                      │
│                                                                 │
│  Week of Jan 27 - Feb 2           $12.34          ✓ Completed  │
│  Week of Jan 20-26                $8.91           ✓ Completed  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Impact Analysis

### User Impact

| Metric | Current | Expected | Change |
|--------|---------|----------|--------|
| Donation completion rate | ~30% (estimated) | ~90% | +200% |
| Time to donate | 2-3 minutes/donation | 0 (automatic) | -100% |
| User engagement (weekly) | Requires action | Passive | Reduced friction |
| Monthly donation volume | $X per user | 2-3x | Increased giving |

**Qualitative Benefits:**
- "Set and forget" experience matches user expectations
- Aligns with successful models (Acorns, Stash, Qapital)
- Removes guilt of "forgotten" pending donations
- Encourages higher donation multipliers

### Business Impact

| Metric | Impact |
|--------|--------|
| Revenue potential | Platform fee on donations possible |
| User retention | Higher (invested users stay) |
| Marketing angle | "Automatic giving" differentiator |
| Operational cost | Lower (less support for manual flow) |

**Risks:**
- ACH failures impact user trust
- Change API costs may affect margins
- Regulatory complexity (ACH mandates)

---

## Trade-offs & Decisions

### Decision 1: Stripe ACH vs. Direct Plaid ACH

**Chose: Stripe ACH**

| Factor | Stripe ACH | Plaid Transfer |
|--------|------------|----------------|
| Integration complexity | Lower (existing Stripe) | Higher (new service) |
| Fees | 0.8% capped at $5 | Similar |
| Settlement time | 3-5 days | 1-2 days |
| Existing infrastructure | ✅ Have Stripe | ❌ Would need setup |

**Rationale:** We already have Stripe for subscriptions. Adding ACH is incremental.

---

### Decision 2: Change API vs. Every.org Partner API

**Chose: Change API**

| Factor | Change API | Every.org Partner |
|--------|------------|-------------------|
| Programmatic donations | ✅ Full support | ⚠️ Requires approval |
| Availability | ✅ Open signup | ❌ Contact required |
| Compliance | ✅ Handled via DAF | ⚠️ Unclear |
| Tax receipts | ✅ Automatic | Manual |

**Rationale:** Every.org requires partner approval for disbursements API. Change is available now.

---

### Decision 3: Weekly vs. Real-time Processing

**Chose: Weekly batching**

| Factor | Weekly Batch | Real-time |
|--------|--------------|-----------|
| ACH efficiency | ✅ Single debit | ❌ Many small debits |
| User experience | Good | Better |
| Failure handling | Easier | Complex |
| Implementation | Simpler | Complex |

**Rationale:** Weekly batching reduces ACH costs and simplifies failure handling. Can add real-time later.

---

### Decision 4: Keep Every.org for Manual Donations

**Decision: Yes, dual system**

- Every.org: Manual one-click donations (existing flow)
- Change: Automatic weekly donations (new flow)
- User chooses preference in settings

**Rationale:** Some users prefer manual control. Don't force everyone to auto-donate.

---

## Deferred Items (Future Phases)

### Phase 2: Real-time Donations
- Process donations as transactions occur
- Requires more complex ACH handling
- Higher fee impact

### Phase 3: Card-based Auto-Donations
- Alternative to ACH for users who prefer cards
- Higher fees (2.9% vs 0.8%)
- Faster settlement

### Phase 4: DAF Integration
- Accept donations from Donor Advised Funds
- Chariot integration for DAF payments
- Higher donation amounts typical

### Phase 5: Every.org Partner API
- If approved, could replace Change for some charities
- Keep Change as fallback

### Phase 6: Tax Optimization
- Year-end donation summaries
- Tax-loss harvesting equivalent for donations
- Integration with tax software

---

## Lessons Learned

### Research Phase

1. **Every.org limitations not obvious**
   - Documentation shows donate links, not programmatic donations
   - Disbursements API requires partner approval
   - Should have contacted them earlier

2. **Plaid Auth not enabled by default**
   - Current implementation only uses Transactions
   - Auth product needed for bank account numbers
   - Easy to add, but requires re-linking for existing users

3. **ACH has regulatory requirements**
   - NACHA rules require explicit authorization
   - 7-day notice for changes
   - Must store mandate text

### Architecture Decisions

1. **Change API was the missing piece**
   - Enables true programmatic donations
   - Handles compliance we'd otherwise need
   - SOC 2 certified, reduces our burden

2. **Stripe ACH is well-integrated with Plaid**
   - Official partnership, documented flow
   - Single API call to link accounts
   - Leverages existing Stripe infrastructure

3. **Weekly batching is right for v1**
   - Simpler to implement and debug
   - Lower costs per donation
   - Can iterate to real-time later

---

## Success Metrics

### Launch Criteria
- [ ] 10 test users complete full flow in sandbox
- [ ] ACH success rate >95% in testing
- [ ] Change API integration verified with 5+ charities
- [ ] Email notifications working
- [ ] Error handling tested (failed ACH, failed distribution)

### Post-Launch KPIs
- Donation completion rate (target: >85%)
- Average weekly donation amount
- User opt-in rate for auto-donations
- ACH failure rate (target: <5%)
- Support tickets related to auto-donations

---

## Appendix

### External Documentation
- [Change API Docs](https://docs.getchange.io/)
- [Stripe ACH Direct Debit](https://docs.stripe.com/payments/ach-direct-debit)
- [Plaid Auth + Stripe Integration](https://plaid.com/docs/auth/partnerships/stripe/)
- [NACHA ACH Rules](https://www.nacha.org/rules)

### Environment Variables Required
```env
# Change API
CHANGE_API_KEY=sk_live_xxx
CHANGE_WEBHOOK_SECRET=whsec_xxx

# Plaid (update)
PLAID_PRODUCTS=transactions,auth

# Stripe (existing, add ACH capability)
STRIPE_SECRET_KEY=sk_live_xxx
```

### Migration Checklist
- [ ] Add Plaid Auth product to existing Link configuration
- [ ] Existing users must re-authorize to enable ACH
- [ ] Map existing charities to Change nonprofit IDs
- [ ] Update Terms of Service for ACH authorization
- [ ] Update Privacy Policy for Change data sharing
