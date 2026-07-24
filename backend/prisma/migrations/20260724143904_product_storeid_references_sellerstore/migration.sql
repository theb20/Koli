-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_storeId_fkey";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "seller_stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
