-- AlterTable
ALTER TABLE "StaffInvite" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "usedByStaffUserId" TEXT;
