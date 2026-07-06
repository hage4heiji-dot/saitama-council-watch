-- AlterTable
ALTER TABLE "bills" ALTER COLUMN "submitted_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "meetings" ALTER COLUMN "date" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "meetings_session_name_meeting_type_key" ON "meetings"("session_name", "meeting_type");

