-- CreateTable
CREATE TABLE "promo_banners" (
    "id" SERIAL NOT NULL,
    "slot" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'En savoir plus',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_banners_slot_idx" ON "promo_banners"("slot");
