-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tableNumber" TEXT;

-- CreateIndex
CREATE INDEX "Order_tableNumber_idx" ON "Order"("tableNumber");
