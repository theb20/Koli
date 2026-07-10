-- AlterTable
ALTER TABLE "site_settings" DROP COLUMN "emailDesignCss";
ALTER TABLE "site_settings" ADD COLUMN "emailPrimaryColor" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailHeaderGradientFrom" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailHeaderGradientTo" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailCardRadius" INTEGER;
ALTER TABLE "site_settings" ADD COLUMN "emailCardBg" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailBodyBg" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailFooterText" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailLogoUrl" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "emailBadgeText" TEXT;
