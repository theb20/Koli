-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "returnWindowDays" INTEGER NOT NULL DEFAULT 14;

-- CreateTable
CREATE TABLE "order_returns" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT NOT NULL,
    "customerComment" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "photos" TEXT,
    "refundAmount" INTEGER,
    "refundMethod" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_return_items" (
    "id" SERIAL NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_returns_orderId_idx" ON "order_returns"("orderId");

-- CreateIndex
CREATE INDEX "order_returns_userId_idx" ON "order_returns"("userId");

-- CreateIndex
CREATE INDEX "order_returns_status_idx" ON "order_returns"("status");

-- CreateIndex
CREATE INDEX "order_return_items_returnId_idx" ON "order_return_items"("returnId");

-- CreateIndex
CREATE INDEX "order_return_items_orderItemId_idx" ON "order_return_items"("orderItemId");

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
