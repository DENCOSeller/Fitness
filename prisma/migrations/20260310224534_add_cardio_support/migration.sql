-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'strength';

-- AlterTable
ALTER TABLE "workout_sets" ADD COLUMN     "distance" DOUBLE PRECISION,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "heart_rate" INTEGER,
ADD COLUMN     "incline" DOUBLE PRECISION,
ADD COLUMN     "speed" DOUBLE PRECISION,
ALTER COLUMN "reps" SET DEFAULT 0,
ALTER COLUMN "weight" SET DEFAULT 0;
