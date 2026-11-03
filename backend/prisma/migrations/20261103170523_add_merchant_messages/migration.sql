-- CreateTable
CREATE TABLE "merchant_messages" (
    "id" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "readByMerchantAt" TIMESTAMP(3),
    "readByAdminAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_messages_storeId_createdAt_idx" ON "merchant_messages"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "merchant_messages" ADD CONSTRAINT "merchant_messages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "seller_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
