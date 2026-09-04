-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "winipayerRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_winipayerRef_key" ON "orders"("winipayerRef");

