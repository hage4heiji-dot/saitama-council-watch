-- CreateEnum
CREATE TYPE "CouncilTermOrigin" AS ENUM ('ELECTION', 'RUNNER_UP_SUCCESSION');

-- CreateEnum
CREATE TYPE "ElectionKind" AS ENUM ('REGULAR', 'BY_ELECTION');

-- CreateEnum
CREATE TYPE "DateBasis" AS ENUM ('EXPLICIT', 'ASSUMED');

-- CreateTable
CREATE TABLE "council_terms" (
    "id" TEXT NOT NULL,
    "origin" "CouncilTermOrigin" NOT NULL,
    "election_kind" "ElectionKind",
    "election_date" DATE,
    "ward" TEXT NOT NULL,
    "candidate_raw_name" TEXT NOT NULL,
    "party_raw_name" TEXT,
    "elected_rank" INTEGER,
    "vote_count" DECIMAL(10,3),
    "term_start_date" DATE NOT NULL,
    "term_start_date_basis" "DateBasis" NOT NULL,
    "term_end_date" DATE,
    "term_end_date_basis" "DateBasis",
    "resigned_date" DATE,
    "successor_raw_name" TEXT,
    "predecessor_raw_name" TEXT,
    "legislator_id" TEXT,
    "source_document_id" TEXT NOT NULL,

    CONSTRAINT "council_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "council_terms_legislator_id_idx" ON "council_terms"("legislator_id");

-- CreateIndex
CREATE INDEX "council_terms_ward_idx" ON "council_terms"("ward");

-- CreateIndex
CREATE UNIQUE INDEX "council_terms_ward_candidate_raw_name_term_start_date_key" ON "council_terms"("ward", "candidate_raw_name", "term_start_date");

-- AddForeignKey
ALTER TABLE "council_terms" ADD CONSTRAINT "council_terms_legislator_id_fkey" FOREIGN KEY ("legislator_id") REFERENCES "legislators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_terms" ADD CONSTRAINT "council_terms_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
