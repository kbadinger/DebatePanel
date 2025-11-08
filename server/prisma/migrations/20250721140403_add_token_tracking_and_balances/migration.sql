/*
  Warnings:

  - You are about to drop the column `cost` on the `UsageRecord` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `UsageRecord` table. All the data in the column will be lost.
  - You are about to drop the column `tokens` on the `UsageRecord` table. All the data in the column will be lost.
  - Added the required column `currentBalance` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentPeriodStart` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthlyAllowance` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apiCost` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputTokens` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelProvider` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputTokens` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformFee` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roundNumber` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `UsageRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "currentBalance" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "monthlyAllowance" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rolloverBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rolloverExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UsageRecord" DROP COLUMN "cost",
DROP COLUMN "provider",
DROP COLUMN "tokens",
ADD COLUMN     "apiCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "inputTokens" INTEGER NOT NULL,
ADD COLUMN     "modelProvider" TEXT NOT NULL,
ADD COLUMN     "outputTokens" INTEGER NOT NULL,
ADD COLUMN     "platformFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "roundNumber" INTEGER NOT NULL,
ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE INDEX "UsageRecord_debateId_roundNumber_idx" ON "UsageRecord"("debateId", "roundNumber");
