-- CreateTable
CREATE TABLE "deal_announcements" (
    "id" SERIAL NOT NULL,
    "productIds" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "inactiveDays" INTEGER,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recipientCount" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "deal_announcements_pkey" PRIMARY KEY ("id")
);
