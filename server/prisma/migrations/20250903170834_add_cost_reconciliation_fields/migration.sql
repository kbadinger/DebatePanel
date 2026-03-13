-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "providerCostFetched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "providerCostFetchedAt" TIMESTAMP(3),
ADD COLUMN     "reconciliationNotes" TEXT;
