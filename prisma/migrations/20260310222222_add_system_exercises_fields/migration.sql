-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "equipment" TEXT,
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "muscle_groups" TEXT,
ADD COLUMN     "tips" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;
