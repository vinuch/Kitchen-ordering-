/*
  Warnings:

  - A unique constraint covering the columns `[staffCode]` on the table `StaffUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `staffCode` to the `StaffUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "staffCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_staffCode_key" ON "StaffUser"("staffCode");
