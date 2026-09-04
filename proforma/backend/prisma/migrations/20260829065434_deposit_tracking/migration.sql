-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "depositPaidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" TEXT;

-- AlterTable
ALTER TABLE "Proforma" ADD COLUMN     "depositPaidAt" TIMESTAMP(3);
