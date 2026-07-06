-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "date",
ADD COLUMN     "end_date" DATE,
ADD COLUMN     "start_date" DATE;

