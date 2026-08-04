-- AlterTable
ALTER TABLE "product_requests" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_requests_orderId_key" ON "product_requests"("orderId");

-- AddForeignKey
ALTER TABLE "product_requests" ADD CONSTRAINT "product_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
