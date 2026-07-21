-- AlterTable
ALTER TABLE "users" ADD COLUMN "magicTokenHash" TEXT,
ADD COLUMN "magicTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_magicTokenHash_key" ON "users"("magicTokenHash");
