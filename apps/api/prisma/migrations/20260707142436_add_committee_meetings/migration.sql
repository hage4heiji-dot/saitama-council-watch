-- CreateTable
CREATE TABLE "committee_meetings" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "committee_name" TEXT NOT NULL,
    "meeting_id" TEXT,

    CONSTRAINT "committee_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "committee_meetings_meeting_id_idx" ON "committee_meetings"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "committee_meetings_date_committee_name_key" ON "committee_meetings"("date", "committee_name");

-- AddForeignKey
ALTER TABLE "committee_meetings" ADD CONSTRAINT "committee_meetings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
