-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "loyaltyMinRedeem" INTEGER NOT NULL DEFAULT 500;
