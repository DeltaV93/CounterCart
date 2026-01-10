-- =============================================
-- CounterCart / DonateBalance Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing ENUMs if they exist (for clean re-runs)
DROP TYPE IF EXISTS "PlaidItemStatus" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "DonationBatchStatus" CASCADE;
DROP TYPE IF EXISTS "DonationStatus" CASCADE;
DROP TYPE IF EXISTS "WebhookStatus" CASCADE;

-- Create ENUMs
CREATE TYPE "PlaidItemStatus" AS ENUM ('ACTIVE', 'LOGIN_REQUIRED', 'ERROR', 'DISCONNECTED');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'MATCHED', 'BATCHED', 'DONATED', 'SKIPPED', 'FAILED');
CREATE TYPE "DonationBatchStatus" AS ENUM ('PENDING', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT,
    "donationMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "monthlyLimit" DECIMAL(10,2),
    "currentMonthTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "autoDonateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- =============================================
-- CAUSES TABLE (Public read, admin write)
-- =============================================
CREATE TABLE "Cause" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconName" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cause_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cause_name_key" ON "Cause"("name");
CREATE UNIQUE INDEX "Cause_slug_key" ON "Cause"("slug");
CREATE INDEX "Cause_slug_idx" ON "Cause"("slug");

-- =============================================
-- CHARITY TABLE (Public read, admin write)
-- =============================================
CREATE TABLE "Charity" (
    "id" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "everyOrgSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ein" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Charity_everyOrgSlug_key" ON "Charity"("everyOrgSlug");
CREATE INDEX "Charity_causeId_idx" ON "Charity"("causeId");
CREATE INDEX "Charity_everyOrgSlug_idx" ON "Charity"("everyOrgSlug");
CREATE INDEX "Charity_causeId_isDefault_idx" ON "Charity"("causeId", "isDefault");

-- =============================================
-- BUSINESS MAPPING TABLE (Public read, admin write)
-- =============================================
CREATE TABLE "BusinessMapping" (
    "id" TEXT NOT NULL,
    "merchantPattern" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "charitySlug" TEXT NOT NULL,
    "charityName" TEXT NOT NULL,
    "reason" TEXT,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMapping_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessMapping_merchantPattern_idx" ON "BusinessMapping"("merchantPattern");
CREATE INDEX "BusinessMapping_causeId_idx" ON "BusinessMapping"("causeId");
CREATE INDEX "BusinessMapping_isActive_idx" ON "BusinessMapping"("isActive");

-- =============================================
-- USER CAUSES TABLE (User's selected causes)
-- =============================================
CREATE TABLE "UserCause" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCause_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCause_userId_causeId_key" ON "UserCause"("userId", "causeId");
CREATE INDEX "UserCause_userId_idx" ON "UserCause"("userId");

-- =============================================
-- PLAID ITEM TABLE
-- =============================================
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "cursor" TEXT,
    "status" "PlaidItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");
CREATE INDEX "PlaidItem_itemId_idx" ON "PlaidItem"("itemId");

-- =============================================
-- BANK ACCOUNT TABLE
-- =============================================
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "mask" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankAccount_plaidAccountId_key" ON "BankAccount"("plaidAccountId");
CREATE INDEX "BankAccount_plaidItemId_idx" ON "BankAccount"("plaidItemId");
CREATE INDEX "BankAccount_plaidAccountId_idx" ON "BankAccount"("plaidAccountId");

-- =============================================
-- TRANSACTION TABLE
-- =============================================
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "merchantNameNorm" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT[],
    "matchedMappingId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_plaidTransactionId_idx" ON "Transaction"("plaidTransactionId");
CREATE INDEX "Transaction_merchantNameNorm_idx" ON "Transaction"("merchantNameNorm");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_userId_status_date_idx" ON "Transaction"("userId", "status", "date");

-- =============================================
-- DONATION BATCH TABLE
-- =============================================
CREATE TABLE "DonationBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" DATE NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "DonationBatchStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DonationBatch_userId_weekOf_key" ON "DonationBatch"("userId", "weekOf");
CREATE INDEX "DonationBatch_userId_status_idx" ON "DonationBatch"("userId", "status");
CREATE INDEX "DonationBatch_weekOf_idx" ON "DonationBatch"("weekOf");

-- =============================================
-- DONATION TABLE
-- =============================================
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT,
    "transactionId" TEXT,
    "charityId" TEXT NOT NULL,
    "charitySlug" TEXT NOT NULL,
    "charityName" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "everyOrgId" TEXT,
    "receiptUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Donation_transactionId_key" ON "Donation"("transactionId");
CREATE UNIQUE INDEX "Donation_everyOrgId_key" ON "Donation"("everyOrgId");
CREATE INDEX "Donation_userId_createdAt_idx" ON "Donation"("userId", "createdAt");
CREATE INDEX "Donation_status_idx" ON "Donation"("status");
CREATE INDEX "Donation_batchId_idx" ON "Donation"("batchId");
CREATE INDEX "Donation_everyOrgId_idx" ON "Donation"("everyOrgId");

-- =============================================
-- WEBHOOK EVENT TABLE
-- =============================================
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "processedAt" TIMESTAMP(3),
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_source_eventId_key" ON "WebhookEvent"("source", "eventId");
CREATE INDEX "WebhookEvent_source_eventType_idx" ON "WebhookEvent"("source", "eventType");
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================
ALTER TABLE "UserCause" ADD CONSTRAINT "UserCause_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCause" ADD CONSTRAINT "UserCause_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Charity" ADD CONSTRAINT "Charity_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessMapping" ADD CONSTRAINT "BusinessMapping_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_matchedMappingId_fkey" FOREIGN KEY ("matchedMappingId") REFERENCES "BusinessMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DonationBatch" ADD CONSTRAINT "DonationBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DonationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cause" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Charity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCause" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaidItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DonationBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Donation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Cause: Anyone can read active causes (for onboarding)
CREATE POLICY "Causes are viewable by everyone" ON "Cause"
    FOR SELECT USING ("isActive" = true);

-- Charity: Anyone can read active charities
CREATE POLICY "Charities are viewable by everyone" ON "Charity"
    FOR SELECT USING ("isActive" = true);

-- BusinessMapping: Anyone can read active mappings
CREATE POLICY "BusinessMappings are viewable by everyone" ON "BusinessMapping"
    FOR SELECT USING ("isActive" = true);

-- User: Users can only access their own data
CREATE POLICY "Users can view own data" ON "User"
    FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own data" ON "User"
    FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Users can insert own data" ON "User"
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- UserCause: Users can only access their own causes
CREATE POLICY "Users can view own causes" ON "UserCause"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own causes" ON "UserCause"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own causes" ON "UserCause"
    FOR DELETE USING (auth.uid()::text = "userId");

-- PlaidItem: Users can only access their own Plaid items
CREATE POLICY "Users can view own PlaidItems" ON "PlaidItem"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own PlaidItems" ON "PlaidItem"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own PlaidItems" ON "PlaidItem"
    FOR UPDATE USING (auth.uid()::text = "userId");

-- BankAccount: Users can access their own bank accounts (via PlaidItem)
CREATE POLICY "Users can view own BankAccounts" ON "BankAccount"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "PlaidItem"
            WHERE "PlaidItem".id = "BankAccount"."plaidItemId"
            AND "PlaidItem"."userId" = auth.uid()::text
        )
    );

-- Transaction: Users can only access their own transactions
CREATE POLICY "Users can view own Transactions" ON "Transaction"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own Transactions" ON "Transaction"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- DonationBatch: Users can only access their own batches
CREATE POLICY "Users can view own DonationBatches" ON "DonationBatch"
    FOR SELECT USING (auth.uid()::text = "userId");

-- Donation: Users can only access their own donations
CREATE POLICY "Users can view own Donations" ON "Donation"
    FOR SELECT USING (auth.uid()::text = "userId");

-- WebhookEvent: No direct user access (server-side only)
-- Service role will bypass RLS

-- =============================================
-- SERVICE ROLE BYPASS (for server-side operations)
-- The service_role key bypasses RLS automatically
-- =============================================

-- =============================================
-- SEED DATA: CAUSES
-- =============================================
INSERT INTO "Cause" ("id", "name", "slug", "description", "iconName", "color", "isActive") VALUES
    ('cause_lgbtq', 'LGBTQ+ Rights', 'lgbtq', 'Support organizations fighting for LGBTQ+ equality and rights', 'Heart', 'bg-pink-500', true),
    ('cause_climate', 'Climate Action', 'climate', 'Fund climate change solutions and environmental protection', 'Leaf', 'bg-green-500', true),
    ('cause_reproductive', 'Reproductive Rights', 'reproductive', 'Support access to reproductive healthcare and rights', 'Shield', 'bg-purple-500', true),
    ('cause_racial', 'Racial Justice', 'racial-justice', 'Combat systemic racism and support equity initiatives', 'Users', 'bg-orange-500', true),
    ('cause_gun', 'Gun Safety', 'gun-safety', 'Support common-sense gun safety legislation and advocacy', 'ShieldAlert', 'bg-red-500', true),
    ('cause_workers', 'Workers Rights', 'workers-rights', 'Support fair wages, unions, and worker protections', 'Briefcase', 'bg-blue-500', true);

-- =============================================
-- SEED DATA: CHARITIES
-- =============================================
INSERT INTO "Charity" ("id", "causeId", "everyOrgSlug", "name", "description", "isDefault", "isActive") VALUES
    ('charity_trevor', 'cause_lgbtq', 'the-trevor-project', 'The Trevor Project', 'Crisis intervention and suicide prevention for LGBTQ+ youth', true, true),
    ('charity_lambda', 'cause_lgbtq', 'lambda-legal', 'Lambda Legal', 'Legal advocacy for LGBTQ+ civil rights', false, true),
    ('charity_edf', 'cause_climate', 'environmental-defense-fund', 'Environmental Defense Fund', 'Environmental advocacy and climate solutions', true, true),
    ('charity_rainforest', 'cause_climate', 'rainforest-alliance', 'Rainforest Alliance', 'Forest conservation and sustainable agriculture', false, true),
    ('charity_350', 'cause_climate', '350-org', '350.org', 'Global grassroots climate movement', false, true),
    ('charity_sierra', 'cause_climate', 'sierra-club-foundation', 'Sierra Club Foundation', 'Environmental conservation and climate action', false, true),
    ('charity_pp', 'cause_reproductive', 'planned-parenthood-federation-of-america-inc', 'Planned Parenthood', 'Reproductive healthcare and education', true, true),
    ('charity_naacp', 'cause_racial', 'naacp-legal-defense-and-educational-fund', 'NAACP Legal Defense Fund', 'Civil rights legal advocacy', true, true),
    ('charity_everytown', 'cause_gun', 'everytown-for-gun-safety-support-fund', 'Everytown for Gun Safety', 'Gun violence prevention advocacy', true, true),
    ('charity_nelp', 'cause_workers', 'national-employment-law-project', 'National Employment Law Project', 'Worker rights and fair labor policies', true, true);

-- =============================================
-- SEED DATA: BUSINESS MAPPINGS
-- =============================================
INSERT INTO "BusinessMapping" ("id", "merchantPattern", "merchantName", "causeId", "charitySlug", "charityName", "reason", "isActive") VALUES
    ('map_chickfila', 'CHICK-FIL-A', 'Chick-fil-A', 'cause_lgbtq', 'the-trevor-project', 'The Trevor Project', 'History of donations to anti-LGBTQ+ organizations', true),
    ('map_hobbylobby_lgbtq', 'HOBBY LOBBY', 'Hobby Lobby', 'cause_lgbtq', 'lambda-legal', 'Lambda Legal', 'Support for anti-LGBTQ+ legislation', true),
    ('map_salvation', 'SALVATION ARMY', 'Salvation Army', 'cause_lgbtq', 'the-trevor-project', 'The Trevor Project', 'Historical discrimination against LGBTQ+ individuals', true),
    ('map_exxon', 'EXXON', 'ExxonMobil', 'cause_climate', 'environmental-defense-fund', 'Environmental Defense Fund', 'Climate change denial funding and lobbying', true),
    ('map_shell', 'SHELL', 'Shell', 'cause_climate', 'rainforest-alliance', 'Rainforest Alliance', 'Major fossil fuel producer and environmental impact', true),
    ('map_bp', 'BP ', 'BP', 'cause_climate', '350-org', '350.org', 'Major oil company with significant environmental impact', true),
    ('map_chevron', 'CHEVRON', 'Chevron', 'cause_climate', 'sierra-club-foundation', 'Sierra Club Foundation', 'Fossil fuel extraction and environmental violations', true),
    ('map_hobbylobby_repro', 'HOBBY LOBBY', 'Hobby Lobby', 'cause_reproductive', 'planned-parenthood-federation-of-america-inc', 'Planned Parenthood', 'Opposition to contraception coverage and reproductive rights', true),
    ('map_walmart', 'WALMART', 'Walmart', 'cause_workers', 'national-employment-law-project', 'National Employment Law Project', 'Labor practices and wages concerns', true),
    ('map_amazon', 'AMAZON', 'Amazon', 'cause_workers', 'national-employment-law-project', 'National Employment Law Project', 'Warehouse worker conditions and union opposition', true),
    ('map_basspro', 'BASS PRO', 'Bass Pro Shops', 'cause_gun', 'everytown-for-gun-safety-support-fund', 'Everytown for Gun Safety', 'Major firearms retailer', true),
    ('map_cabelas', 'CABELA', 'Cabelas', 'cause_gun', 'everytown-for-gun-safety-support-fund', 'Everytown for Gun Safety', 'Major firearms retailer', true);

-- =============================================
-- DONE! Your database is now set up.
-- =============================================
