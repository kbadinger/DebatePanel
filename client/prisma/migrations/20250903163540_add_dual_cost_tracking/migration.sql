/*
  Warnings:

  - Added the required column `estimatedApiCost` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "actualApiCost" DOUBLE PRECISION,
ADD COLUMN     "costAccuracy" DOUBLE PRECISION,
ADD COLUMN     "costDelta" DOUBLE PRECISION,
ADD COLUMN     "costSource" TEXT,
ADD COLUMN     "estimatedApiCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "hasActualCost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "providerCostData" JSONB;

-- CreateIndex
CREATE INDEX "UsageRecord_hasActualCost_modelProvider_idx" ON "UsageRecord"("hasActualCost", "modelProvider");
