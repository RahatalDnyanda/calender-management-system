-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalStartTime" TIMESTAMP(3),
ADD COLUMN     "recurrenceId" TEXT,
ADD COLUMN     "rrule" TEXT;

-- CreateIndex
CREATE INDEX "Event_recurrenceId_originalStartTime_idx" ON "Event"("recurrenceId", "originalStartTime");
