-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paydunyaToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_paydunyaToken_key" ON "orders"("paydunyaToken");
