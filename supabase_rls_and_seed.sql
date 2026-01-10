-- =============================================
-- CounterCart - Add RLS Policies & Seed Data
-- Run this if tables already exist from Prisma
-- =============================================

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cause" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Charity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCause" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCharity" ENABLE ROW LEVEL SECURITY;
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

-- UserCharity: Users can only access their own charity preferences
CREATE POLICY "Users can view own charity preferences" ON "UserCharity"
    FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own charity preferences" ON "UserCharity"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own charity preferences" ON "UserCharity"
    FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own charity preferences" ON "UserCharity"
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
-- SEED DATA: CAUSES
-- =============================================
INSERT INTO "Cause" ("id", "name", "slug", "description", "iconName", "color", "isActive") VALUES
    ('cause_lgbtq', 'LGBTQ+ Rights', 'lgbtq', 'Support organizations fighting for LGBTQ+ equality and rights', 'Heart', 'bg-pink-500', true),
    ('cause_climate', 'Climate Action', 'climate', 'Fund climate change solutions and environmental protection', 'Leaf', 'bg-green-500', true),
    ('cause_reproductive', 'Reproductive Rights', 'reproductive', 'Support access to reproductive healthcare and rights', 'Shield', 'bg-purple-500', true),
    ('cause_racial', 'Racial Justice', 'racial-justice', 'Combat systemic racism and support equity initiatives', 'Users', 'bg-orange-500', true),
    ('cause_gun', 'Gun Safety', 'gun-safety', 'Support common-sense gun safety legislation and advocacy', 'ShieldAlert', 'bg-red-500', true),
    ('cause_workers', 'Workers Rights', 'workers-rights', 'Support fair wages, unions, and worker protections', 'Briefcase', 'bg-blue-500', true)
ON CONFLICT ("id") DO NOTHING;

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
    ('charity_nelp', 'cause_workers', 'national-employment-law-project', 'National Employment Law Project', 'Worker rights and fair labor policies', true, true)
ON CONFLICT ("id") DO NOTHING;

-- =============================================
-- SEED DATA: BUSINESS MAPPINGS
-- =============================================
INSERT INTO "BusinessMapping" ("id", "merchantPattern", "merchantName", "causeId", "charitySlug", "charityName", "reason", "isActive", "updatedAt") VALUES
    ('map_chickfila', 'CHICK-FIL-A', 'Chick-fil-A', 'cause_lgbtq', 'the-trevor-project', 'The Trevor Project', 'History of donations to anti-LGBTQ+ organizations', true, CURRENT_TIMESTAMP),
    ('map_hobbylobby_lgbtq', 'HOBBY LOBBY', 'Hobby Lobby', 'cause_lgbtq', 'lambda-legal', 'Lambda Legal', 'Support for anti-LGBTQ+ legislation', true, CURRENT_TIMESTAMP),
    ('map_salvation', 'SALVATION ARMY', 'Salvation Army', 'cause_lgbtq', 'the-trevor-project', 'The Trevor Project', 'Historical discrimination against LGBTQ+ individuals', true, CURRENT_TIMESTAMP),
    ('map_exxon', 'EXXON', 'ExxonMobil', 'cause_climate', 'environmental-defense-fund', 'Environmental Defense Fund', 'Climate change denial funding and lobbying', true, CURRENT_TIMESTAMP),
    ('map_shell', 'SHELL', 'Shell', 'cause_climate', 'rainforest-alliance', 'Rainforest Alliance', 'Major fossil fuel producer and environmental impact', true, CURRENT_TIMESTAMP),
    ('map_bp', 'BP ', 'BP', 'cause_climate', '350-org', '350.org', 'Major oil company with significant environmental impact', true, CURRENT_TIMESTAMP),
    ('map_chevron', 'CHEVRON', 'Chevron', 'cause_climate', 'sierra-club-foundation', 'Sierra Club Foundation', 'Fossil fuel extraction and environmental violations', true, CURRENT_TIMESTAMP),
    ('map_hobbylobby_repro', 'HOBBY LOBBY', 'Hobby Lobby', 'cause_reproductive', 'planned-parenthood-federation-of-america-inc', 'Planned Parenthood', 'Opposition to contraception coverage and reproductive rights', true, CURRENT_TIMESTAMP),
    ('map_walmart', 'WALMART', 'Walmart', 'cause_workers', 'national-employment-law-project', 'National Employment Law Project', 'Labor practices and wages concerns', true, CURRENT_TIMESTAMP),
    ('map_amazon', 'AMAZON', 'Amazon', 'cause_workers', 'national-employment-law-project', 'National Employment Law Project', 'Warehouse worker conditions and union opposition', true, CURRENT_TIMESTAMP),
    ('map_basspro', 'BASS PRO', 'Bass Pro Shops', 'cause_gun', 'everytown-for-gun-safety-support-fund', 'Everytown for Gun Safety', 'Major firearms retailer', true, CURRENT_TIMESTAMP),
    ('map_cabelas', 'CABELA', 'Cabelas', 'cause_gun', 'everytown-for-gun-safety-support-fund', 'Everytown for Gun Safety', 'Major firearms retailer', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- =============================================
-- DONE! RLS enabled and data seeded.
-- =============================================
