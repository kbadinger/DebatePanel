-- AlterTable
ALTER TABLE "Debate" ADD COLUMN     "isInteractive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ModelResponse" ADD COLUMN     "isHuman" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_debateId_userId_key" ON "Participant"("debateId", "userId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
