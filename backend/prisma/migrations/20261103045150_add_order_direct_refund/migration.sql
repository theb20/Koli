-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "refundAmount" INTEGER,
ADD COLUMN     "refundMethod" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundReference" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
