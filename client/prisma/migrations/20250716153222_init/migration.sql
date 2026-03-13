-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL DEFAULT 'structured',
    "rounds" INTEGER NOT NULL,
    "convergenceThreshold" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "finalSynthesis" TEXT,
    "userId" TEXT,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateRound" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "consensus" TEXT,
    "keyDisagreements" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelResponse" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelSelection" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ModelSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DebateRound_debateId_roundNumber_key" ON "DebateRound"("debateId", "roundNumber");

-- CreateIndex
CREATE INDEX "ModelResponse_roundId_modelId_idx" ON "ModelResponse"("roundId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelSelection_debateId_modelId_key" ON "ModelSelection"("debateId", "modelId");

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateRound" ADD CONSTRAINT "DebateRound_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelResponse" ADD CONSTRAINT "ModelResponse_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "DebateRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelSelection" ADD CONSTRAINT "ModelSelection_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
