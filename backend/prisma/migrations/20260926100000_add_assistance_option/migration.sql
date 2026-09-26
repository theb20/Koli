-- AlterTable
ALTER TABLE "products" ADD COLUMN     "assistanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assistancePrice" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "assistanceTotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "assistance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assistancePrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "assistance" BOOLEAN NOT NULL DEFAULT false;

