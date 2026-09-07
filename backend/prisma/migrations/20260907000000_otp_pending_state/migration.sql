-- B-04: persist pending flow state on the OTP challenge so registration and
-- number-change survive a restart and work across instances (no RAM state).
-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN "name" TEXT;
ALTER TABLE "OtpCode" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "OtpCode_userId_idx" ON "OtpCode"("userId");
