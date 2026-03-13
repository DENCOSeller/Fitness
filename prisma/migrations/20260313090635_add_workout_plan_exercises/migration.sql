-- CreateTable
CREATE TABLE "workout_plan_exercises" (
    "id" SERIAL NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "exercise_id" INTEGER,
    "exercise_name" TEXT NOT NULL,
    "planned_sets" INTEGER NOT NULL,
    "planned_reps" INTEGER NOT NULL,
    "planned_weight" DOUBLE PRECISION,
    "rest_seconds" INTEGER,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_plan_exercises_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workout_plan_exercises" ADD CONSTRAINT "workout_plan_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_exercises" ADD CONSTRAINT "workout_plan_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
