-- CreateTable
CREATE TABLE "progress_photos" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "photo_path" TEXT NOT NULL,
    "ai_analysis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "progress_photos_date_key" ON "progress_photos"("date");
