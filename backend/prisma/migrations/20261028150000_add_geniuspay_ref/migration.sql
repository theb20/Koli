-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "geniusPayRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_geniusPayRef_key" ON "orders"("geniusPayRef");

