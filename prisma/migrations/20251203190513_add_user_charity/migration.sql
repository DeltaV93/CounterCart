-- CreateEnum
CREATE TYPE "PlaidItemStatus" AS ENUM ('ACTIVE', 'LOGIN_REQUIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'MATCHED', 'BATCHED', 'DONATED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "DonationBatchStatus" AS ENUM ('PENDING', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "UserCause" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCharity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCharity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "DonationBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" DATE NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "DonationBatchStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");

-- CreateIndex
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- CreateIndex
CREATE INDEX "PlaidItem_itemId_idx" ON "PlaidItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_plaidAccountId_key" ON "BankAccount"("plaidAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_plaidItemId_idx" ON "BankAccount"("plaidItemId");

-- CreateIndex
CREATE INDEX "BankAccount_plaidAccountId_idx" ON "BankAccount"("plaidAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Cause_name_key" ON "Cause"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cause_slug_key" ON "Cause"("slug");

-- CreateIndex
CREATE INDEX "Cause_slug_idx" ON "Cause"("slug");

-- CreateIndex
CREATE INDEX "UserCause_userId_idx" ON "UserCause"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCause_userId_causeId_key" ON "UserCause"("userId", "causeId");

-- CreateIndex
CREATE INDEX "UserCharity_userId_idx" ON "UserCharity"("userId");

-- CreateIndex
CREATE INDEX "UserCharity_charityId_idx" ON "UserCharity"("charityId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCharity_userId_causeId_key" ON "UserCharity"("userId", "causeId");

-- CreateIndex
CREATE INDEX "BusinessMapping_merchantPattern_idx" ON "BusinessMapping"("merchantPattern");

-- CreateIndex
CREATE INDEX "BusinessMapping_causeId_idx" ON "BusinessMapping"("causeId");

-- CreateIndex
CREATE INDEX "BusinessMapping_isActive_idx" ON "BusinessMapping"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Charity_everyOrgSlug_key" ON "Charity"("everyOrgSlug");

-- CreateIndex
CREATE INDEX "Charity_causeId_idx" ON "Charity"("causeId");

-- CreateIndex
CREATE INDEX "Charity_everyOrgSlug_idx" ON "Charity"("everyOrgSlug");

-- CreateIndex
CREATE INDEX "Charity_causeId_isDefault_idx" ON "Charity"("causeId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_plaidTransactionId_idx" ON "Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_merchantNameNorm_idx" ON "Transaction"("merchantNameNorm");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_status_date_idx" ON "Transaction"("userId", "status", "date");

-- CreateIndex
CREATE INDEX "DonationBatch_userId_status_idx" ON "DonationBatch"("userId", "status");

-- CreateIndex
CREATE INDEX "DonationBatch_weekOf_idx" ON "DonationBatch"("weekOf");

-- CreateIndex
CREATE UNIQUE INDEX "DonationBatch_userId_weekOf_key" ON "DonationBatch"("userId", "weekOf");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_transactionId_key" ON "Donation"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_everyOrgId_key" ON "Donation"("everyOrgId");

-- CreateIndex
CREATE INDEX "Donation_userId_createdAt_idx" ON "Donation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "Donation_batchId_idx" ON "Donation"("batchId");

-- CreateIndex
CREATE INDEX "Donation_everyOrgId_idx" ON "Donation"("everyOrgId");

-- CreateIndex
CREATE INDEX "WebhookEvent_source_eventType_idx" ON "WebhookEvent"("source", "eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_source_eventId_key" ON "WebhookEvent"("source", "eventId");

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCause" ADD CONSTRAINT "UserCause_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCause" ADD CONSTRAINT "UserCause_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCharity" ADD CONSTRAINT "UserCharity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCharity" ADD CONSTRAINT "UserCharity_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMapping" ADD CONSTRAINT "BusinessMapping_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charity" ADD CONSTRAINT "Charity_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "Cause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_matchedMappingId_fkey" FOREIGN KEY ("matchedMappingId") REFERENCES "BusinessMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationBatch" ADD CONSTRAINT "DonationBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DonationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
