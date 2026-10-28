-- CreateTable
CREATE TABLE "product_deletion_requests" (
    "id" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "requestedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_deletion_requests_productId_idx" ON "product_deletion_requests"("productId");

-- CreateIndex
CREATE INDEX "product_deletion_requests_storeId_idx" ON "product_deletion_requests"("storeId");

-- CreateIndex
CREATE INDEX "product_deletion_requests_status_idx" ON "product_deletion_requests"("status");

-- AddForeignKey
ALTER TABLE "product_deletion_requests" ADD CONSTRAINT "product_deletion_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_deletion_requests" ADD CONSTRAINT "product_deletion_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "seller_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_deletion_requests" ADD CONSTRAINT "product_deletion_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_deletion_requests" ADD CONSTRAINT "product_deletion_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

