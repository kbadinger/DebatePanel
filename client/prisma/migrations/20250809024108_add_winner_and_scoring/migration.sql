-- AlterTable
ALTER TABLE "Debate" ADD COLUMN     "victoryReason" TEXT,
ADD COLUMN     "winnerId" TEXT,
ADD COLUMN     "winnerName" TEXT,
ADD COLUMN     "winnerType" TEXT;

-- AlterTable
ALTER TABLE "ModelResponse" ADD COLUMN     "argumentScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DebateScore" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "participantType" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "argumentQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "persuasiveness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logicalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "influenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebateScore_debateId_totalScore_idx" ON "DebateScore"("debateId", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "DebateScore_debateId_participantId_key" ON "DebateScore"("debateId", "participantId");

-- AddForeignKey
ALTER TABLE "DebateScore" ADD CONSTRAINT "DebateScore_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
