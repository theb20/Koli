-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'MARGIN',
    "commissionRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sourcing" (
    "productId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "supplierPrice" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sourcing_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "order_financials" (
    "orderId" TEXT NOT NULL,
    "shippingActualCost" INTEGER,
    "costKnown" BOOLEAN NOT NULL DEFAULT false,
    "snapshotAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_financials_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "order_item_financials" (
    "orderItemId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" INTEGER,
    "sellerStoreId" INTEGER,
    "supplierMode" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION,
    "unitSupplierPrice" INTEGER,
    "unitSellingPriceHt" INTEGER NOT NULL,
    "unitSellingPriceTtc" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "vatAmount" INTEGER NOT NULL,
    "assistanceHt" INTEGER NOT NULL DEFAULT 0,
    "commissionAmount" INTEGER NOT NULL DEFAULT 0,
    "supplierPayout" INTEGER,
    "margin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_financials_pkey" PRIMARY KEY ("orderItemId")
);

-- CreateIndex
CREATE INDEX "product_sourcing_supplierId_idx" ON "product_sourcing"("supplierId");

-- CreateIndex
CREATE INDEX "order_item_financials_orderId_idx" ON "order_item_financials"("orderId");

-- CreateIndex
CREATE INDEX "order_item_financials_supplierId_idx" ON "order_item_financials"("supplierId");

-- CreateIndex
CREATE INDEX "orders_paidAt_idx" ON "orders"("paidAt");

-- AddForeignKey
ALTER TABLE "product_sourcing" ADD CONSTRAINT "product_sourcing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sourcing" ADD CONSTRAINT "product_sourcing_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_financials" ADD CONSTRAINT "order_financials_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_financials" ADD CONSTRAINT "order_item_financials_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_financials" ADD CONSTRAINT "order_item_financials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Garde-fous (non gérés par Prisma, ignorés par migrate diff)
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_mode_check" CHECK ("mode" IN ('MARGIN', 'COMMISSION'));
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_commission_rate_check" CHECK ("commissionRate" IS NULL OR ("commissionRate" >= 0 AND "commissionRate" <= 100));
ALTER TABLE "product_sourcing" ADD CONSTRAINT "product_sourcing_supplier_price_check" CHECK ("supplierPrice" IS NULL OR "supplierPrice" >= 0);
ALTER TABLE "order_financials" ADD CONSTRAINT "order_financials_shipping_cost_check" CHECK ("shippingActualCost" IS NULL OR "shippingActualCost" >= 0);

-- Données existantes -------------------------------------------------------
-- Commandes déjà payées : la date réelle de paiement n'était pas stockée,
-- la date de création est la meilleure approximation disponible.
UPDATE "orders" SET "paidAt" = "createdAt" WHERE "paymentStatus" = 'paid' AND "paidAt" IS NULL;

-- Commandes payées avant le suivi financier : coût fournisseur INCONNU (on
-- n'invente rien). Elles restent dans le CA mais sont exclues des calculs de
-- marge, et comptées comme telles sur le tableau de bord. snapshotAt posé
-- pour qu'elles ne soient jamais figées plus tard avec les prix actuels.
INSERT INTO "order_financials" ("orderId", "costKnown", "snapshotAt", "updatedAt")
SELECT "id", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "orders" WHERE "paymentStatus" = 'paid'
ON CONFLICT ("orderId") DO NOTHING;
