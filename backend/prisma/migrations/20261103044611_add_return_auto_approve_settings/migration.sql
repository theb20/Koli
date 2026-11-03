-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "returnAutoApproveMaxAmount" INTEGER DEFAULT 25000,
ADD COLUMN     "returnAutoApproveMaxRecentCount" INTEGER DEFAULT 3,
ADD COLUMN     "returnAutoApproveRecentDays" INTEGER NOT NULL DEFAULT 30;
