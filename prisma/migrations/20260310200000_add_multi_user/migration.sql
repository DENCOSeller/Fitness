-- Create users table
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Create a default user for existing data migration
INSERT INTO "users" ("email", "password_hash", "name")
VALUES ('admin@denco.health', '$2a$10$placeholder_hash_replace_me', 'Admin');

-- Add user_id columns (nullable first for migration)

ALTER TABLE "check_ins" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "workouts" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "workout_templates" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "meals" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "body_metrics" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "health_daily" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "health_workouts" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "chat_messages" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "progress_photos" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "ai_insights" ADD COLUMN "user_id" INTEGER;

-- Assign all existing data to the default user (id=1)
UPDATE "check_ins" SET "user_id" = 1;
UPDATE "exercises" SET "user_id" = 1;
UPDATE "workouts" SET "user_id" = 1;
UPDATE "workout_templates" SET "user_id" = 1;
UPDATE "meals" SET "user_id" = 1;
UPDATE "body_metrics" SET "user_id" = 1;
UPDATE "health_daily" SET "user_id" = 1;
UPDATE "health_workouts" SET "user_id" = 1;
UPDATE "chat_messages" SET "user_id" = 1;
UPDATE "progress_photos" SET "user_id" = 1;
UPDATE "ai_insights" SET "user_id" = 1;

-- Make user_id NOT NULL
ALTER TABLE "check_ins" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "exercises" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "workouts" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "workout_templates" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "meals" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "body_metrics" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "health_daily" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "health_workouts" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "chat_messages" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "progress_photos" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "ai_insights" ALTER COLUMN "user_id" SET NOT NULL;

-- Drop old unique constraints that need to become composite
DROP INDEX IF EXISTS "check_ins_date_key";
DROP INDEX IF EXISTS "health_daily_date_key";
DROP INDEX IF EXISTS "progress_photos_date_key";

-- Drop old index on chat_messages
DROP INDEX IF EXISTS "chat_messages_session_id_idx";

-- Add composite unique constraints
CREATE UNIQUE INDEX "check_ins_user_id_date_key" ON "check_ins"("user_id", "date");
CREATE UNIQUE INDEX "health_daily_user_id_date_key" ON "health_daily"("user_id", "date");
CREATE UNIQUE INDEX "progress_photos_user_id_date_key" ON "progress_photos"("user_id", "date");
CREATE INDEX "chat_messages_user_id_session_id_idx" ON "chat_messages"("user_id", "session_id");

-- Add foreign keys
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_daily" ADD CONSTRAINT "health_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_workouts" ADD CONSTRAINT "health_workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
