-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- CreateIndex
CREATE INDEX "orders_deletedAt_idx" ON "orders"("deletedAt");
