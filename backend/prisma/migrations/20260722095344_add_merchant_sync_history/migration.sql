-- AlterTable
ALTER TABLE "products" ADD COLUMN     "merchantSyncStatus" TEXT,
ADD COLUMN     "merchantSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "merchant_sync_runs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "actorId" TEXT,
    "actorEmail" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "merchant_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_sync_items" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "warnings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_sync_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_sync_runs_provider_status_idx" ON "merchant_sync_runs"("provider", "status");

-- CreateIndex
CREATE INDEX "merchant_sync_runs_startedAt_idx" ON "merchant_sync_runs"("startedAt");

-- CreateIndex
CREATE INDEX "merchant_sync_items_runId_idx" ON "merchant_sync_items"("runId");

-- CreateIndex
CREATE INDEX "merchant_sync_items_runId_status_idx" ON "merchant_sync_items"("runId", "status");

-- AddForeignKey
ALTER TABLE "merchant_sync_items" ADD CONSTRAINT "merchant_sync_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "merchant_sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
