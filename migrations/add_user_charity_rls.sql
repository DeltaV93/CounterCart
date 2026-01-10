-- =============================================
-- Add RLS to UserCharity table
-- Run this after Prisma migration creates the table
-- =============================================

-- Enable Row Level Security
ALTER TABLE "UserCharity" ENABLE ROW LEVEL SECURITY;

-- Users can only access their own charity preferences
CREATE POLICY "Users can view own charity preferences" ON "UserCharity"
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own charity preferences" ON "UserCharity"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own charity preferences" ON "UserCharity"
    FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own charity preferences" ON "UserCharity"
    FOR DELETE USING (auth.uid()::text = "userId");
