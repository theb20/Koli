-- AlterTable
ALTER TABLE "seller_stores" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;
