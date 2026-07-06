-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('PLENARY', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('SUBMITTED', 'IN_DELIBERATION', 'PASSED', 'REJECTED', 'CARRIED_OVER');

-- CreateEnum
CREATE TYPE "OrdinanceStatus" AS ENUM ('IN_FORCE', 'ABOLISHED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('FOR', 'AGAINST', 'ABSENT', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'HTML', 'MARKDOWN', 'JSON');

-- CreateEnum
CREATE TYPE "AiContentType" AS ENUM ('SUMMARY', 'TAGS', 'FAQ', 'RELATED_INFO');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'LINE', 'PUSH');

-- CreateEnum
CREATE TYPE "BatchJobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "factions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "founded_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legislators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_kana" TEXT NOT NULL,
    "first_elected_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile_url" TEXT,

    CONSTRAINT "legislators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legislator_faction_history" (
    "id" TEXT NOT NULL,
    "legislator_id" TEXT NOT NULL,
    "faction_id" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,

    CONSTRAINT "legislator_faction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meeting_type" "MeetingType" NOT NULL,
    "session_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "submitted_date" DATE NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'SUBMITTED',
    "source_document_id" TEXT NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordinances" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enacted_date" DATE NOT NULL,
    "bill_id" TEXT,
    "status" "OrdinanceStatus" NOT NULL DEFAULT 'IN_FORCE',
    "source_document_id" TEXT NOT NULL,

    CONSTRAINT "ordinances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "legislator_id" TEXT NOT NULL,
    "vote_type" "VoteType" NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "related_bill_id" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "source_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contents" (
    "id" TEXT NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "content_type" "AiContentType" NOT NULL,
    "body" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "ai_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "oauth_provider" TEXT NOT NULL,
    "oauth_subject_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "topic_filter" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_job_runs" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "status" "BatchJobStatus" NOT NULL DEFAULT 'RUNNING',
    "error_message" TEXT,
    "records_processed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "batch_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legislator_faction_history_legislator_id_idx" ON "legislator_faction_history"("legislator_id");

-- CreateIndex
CREATE INDEX "bills_source_document_id_idx" ON "bills"("source_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "bills_meeting_id_bill_number_key" ON "bills"("meeting_id", "bill_number");

-- CreateIndex
CREATE INDEX "ordinances_source_document_id_idx" ON "ordinances"("source_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_bill_id_legislator_id_key" ON "votes"("bill_id", "legislator_id");

-- CreateIndex
CREATE INDEX "budgets_fiscal_year_idx" ON "budgets"("fiscal_year");

-- CreateIndex
CREATE INDEX "documents_checksum_idx" ON "documents"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "documents_source_url_version_key" ON "documents"("source_url", "version");

-- CreateIndex
CREATE INDEX "ai_contents_source_document_id_idx" ON "ai_contents"("source_document_id");

-- CreateIndex
CREATE INDEX "ai_contents_is_verified_idx" ON "ai_contents"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_oauth_provider_oauth_subject_id_key" ON "users"("oauth_provider", "oauth_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_channel_key" ON "notification_settings"("user_id", "channel");

-- CreateIndex
CREATE INDEX "batch_job_runs_job_name_started_at_idx" ON "batch_job_runs"("job_name", "started_at");

-- AddForeignKey
ALTER TABLE "legislator_faction_history" ADD CONSTRAINT "legislator_faction_history_legislator_id_fkey" FOREIGN KEY ("legislator_id") REFERENCES "legislators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legislator_faction_history" ADD CONSTRAINT "legislator_faction_history_faction_id_fkey" FOREIGN KEY ("faction_id") REFERENCES "factions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordinances" ADD CONSTRAINT "ordinances_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordinances" ADD CONSTRAINT "ordinances_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_legislator_id_fkey" FOREIGN KEY ("legislator_id") REFERENCES "legislators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_related_bill_id_fkey" FOREIGN KEY ("related_bill_id") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_contents" ADD CONSTRAINT "ai_contents_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
