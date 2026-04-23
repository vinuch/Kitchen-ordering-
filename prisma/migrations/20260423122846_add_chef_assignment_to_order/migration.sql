-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedChefName" TEXT,
ADD COLUMN     "assignedChefTelegramUserId" TEXT;

-- CreateIndex
CREATE INDEX "Order_assignedChefTelegramUserId_idx" ON "Order"("assignedChefTelegramUserId");
