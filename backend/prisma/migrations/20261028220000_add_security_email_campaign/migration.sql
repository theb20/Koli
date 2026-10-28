-- CreateTable
CREATE TABLE "security_email_campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "targetUserIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "failedEmails" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "security_email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_email_campaigns_status_idx" ON "security_email_campaigns"("status");

-- CreateIndex
CREATE INDEX "security_email_campaigns_createdAt_idx" ON "security_email_campaigns"("createdAt");

-- AddForeignKey
ALTER TABLE "security_email_campaigns" ADD CONSTRAINT "security_email_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

