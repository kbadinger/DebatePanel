/*
  Warnings:

  - You are about to drop the column `orchestratorAnalysis` on the `Debate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Debate" DROP COLUMN "orchestratorAnalysis",
ADD COLUMN     "judgeAnalysis" TEXT;
