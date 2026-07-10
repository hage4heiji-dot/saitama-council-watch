-- 請願(docs/adr/0026)。原文(要旨)まで保持し、紹介議員は複数人つきうるため
-- petition_introducersで多対多にする。

-- CreateEnum
CREATE TYPE "PetitionStatus" AS ENUM ('PENDING', 'ADOPTED', 'REJECTED', 'WITHDRAWN', 'CARRIED_OVER', 'UNCONFIRMED');

-- CreateTable
CREATE TABLE "petitions" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "petition_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "received_date" DATE,
    "petitioner_name" TEXT NOT NULL,
    "committee_name" TEXT,
    "summary" TEXT NOT NULL,
    "status" "PetitionStatus" NOT NULL DEFAULT 'PENDING',
    "decided_date" DATE,
    "source_document_id" TEXT NOT NULL,

    CONSTRAINT "petitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petition_introducers" (
    "id" TEXT NOT NULL,
    "petition_id" TEXT NOT NULL,
    "legislator_id" TEXT,
    "raw_name" TEXT NOT NULL,

    CONSTRAINT "petition_introducers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "petitions_source_document_id_idx" ON "petitions"("source_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "petitions_meeting_id_petition_number_key" ON "petitions"("meeting_id", "petition_number");

-- CreateIndex
CREATE UNIQUE INDEX "petition_introducers_petition_id_raw_name_key" ON "petition_introducers"("petition_id", "raw_name");

-- AddForeignKey
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_introducers" ADD CONSTRAINT "petition_introducers_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "petitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_introducers" ADD CONSTRAINT "petition_introducers_legislator_id_fkey" FOREIGN KEY ("legislator_id") REFERENCES "legislators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
