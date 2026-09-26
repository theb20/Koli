-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reviewToken" TEXT;

-- AlterTable
ALTER TABLE "site_reviews" ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "orderId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "orderId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_reviewToken_key" ON "orders"("reviewToken");

-- CreateIndex
CREATE UNIQUE INDEX "site_reviews_orderId_key" ON "site_reviews"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_orderId_productId_key" ON "reviews"("orderId", "productId");

