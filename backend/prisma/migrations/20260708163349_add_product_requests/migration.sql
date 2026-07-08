-- CreateTable
CREATE TABLE "product_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientPrenom" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientTelephone" TEXT,
    "productName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT,
    "quantity" INTEGER,
    "budget" INTEGER,
    "deliveryAddress" TEXT NOT NULL,
    "desiredDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminReply" TEXT,
    "quotedPrice" INTEGER,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_requests_userId_idx" ON "product_requests"("userId");

-- CreateIndex
CREATE INDEX "product_requests_status_idx" ON "product_requests"("status");

-- AddForeignKey
ALTER TABLE "product_requests" ADD CONSTRAINT "product_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
