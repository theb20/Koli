-- AlterTable
ALTER TABLE "product_requests" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "declineReason" TEXT,
ADD COLUMN     "quoteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "quoteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_requests_quoteToken_key" ON "product_requests"("quoteToken");

