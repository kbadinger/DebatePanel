-- CreateTable
CREATE TABLE "ModelRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelRequestVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelRequestVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelRequest_status_createdAt_idx" ON "ModelRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ModelRequest_userId_idx" ON "ModelRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelRequest_provider_modelName_key" ON "ModelRequest"("provider", "modelName");

-- CreateIndex
CREATE INDEX "ModelRequestVote_requestId_idx" ON "ModelRequestVote"("requestId");

-- CreateIndex
CREATE INDEX "ModelRequestVote_userId_idx" ON "ModelRequestVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelRequestVote_requestId_userId_key" ON "ModelRequestVote"("requestId", "userId");

-- AddForeignKey
ALTER TABLE "ModelRequest" ADD CONSTRAINT "ModelRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelRequestVote" ADD CONSTRAINT "ModelRequestVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ModelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelRequestVote" ADD CONSTRAINT "ModelRequestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
