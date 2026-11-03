-- AlterTable
ALTER TABLE "order_returns" ADD COLUMN     "merchantComment" TEXT,
ADD COLUMN     "merchantCommentedAt" TIMESTAMP(3),
ADD COLUMN     "merchantDamaged" BOOLEAN,
ADD COLUMN     "proofUrl" TEXT;
