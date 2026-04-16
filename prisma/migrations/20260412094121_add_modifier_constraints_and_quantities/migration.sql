-- AlterTable
ALTER TABLE "ModifierGroup" ADD COLUMN     "maxSelect" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "minSelect" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItemModifier" ADD COLUMN     "modifierOptionId" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "OrderItemModifier_modifierOptionId_idx" ON "OrderItemModifier"("modifierOptionId");

-- AddForeignKey
ALTER TABLE "OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
