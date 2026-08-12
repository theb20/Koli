-- CreateTable
CREATE TABLE "site_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_reviews_userId_idx" ON "site_reviews"("userId");

-- CreateIndex
CREATE INDEX "site_reviews_createdAt_idx" ON "site_reviews"("createdAt");

-- AddForeignKey
ALTER TABLE "site_reviews" ADD CONSTRAINT "site_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

