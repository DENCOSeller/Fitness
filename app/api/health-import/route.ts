import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import { parseAppleHealthXml, type ImportResult } from '@/lib/health-import';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

const MAX_ZIP_SIZE = 1024 * 1024 * 1024; // 1 GB

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Нужен ZIP-файл экспорта Apple Health' }, { status: 400 });
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 1 ГБ)' }, { status: 400 });
    }

    // Read ZIP into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Find and extract export.xml from ZIP
    const xmlStream = extractExportXml(buffer);
    if (!xmlStream) {
      return NextResponse.json(
        { error: 'Не найден файл export.xml в ZIP-архиве' },
        { status: 400 }
      );
    }

    // Parse XML with SAX
    const result = await parseAppleHealthXml(xmlStream);

    // Save to DB
    const counts = await saveToDatabase(result, userId);

    return NextResponse.json({
      success: true,
      totalRecordsProcessed: result.totalRecordsProcessed,
      dailyRecords: counts.dailyCount,
      workouts: counts.workoutCount,
    });
  } catch (error) {
    console.error('Health import error:', error);
    return NextResponse.json(
      { error: 'Ошибка импорта данных Apple Health' },
      { status: 500 }
    );
  }
}

function extractExportXml(buffer: Buffer): Readable | null {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Look for export.xml (may be in apple_health_export/ folder)
  const xmlEntry = entries.find(
    (e) =>
      e.entryName.endsWith('export.xml') ||
      e.entryName.endsWith('Export.xml')
  );

  if (!xmlEntry) return null;

  const xmlBuffer = xmlEntry.getData();
  return Readable.from(xmlBuffer);
}

async function saveToDatabase(result: ImportResult, userId: number) {
  let dailyCount = 0;
  let workoutCount = 0;

  // Upsert daily records
  const dailyEntries = Array.from(result.dailyRecords.entries());

  // Process in batches of 100
  for (let i = 0; i < dailyEntries.length; i += 100) {
    const batch = dailyEntries.slice(i, i + 100);
    await Promise.all(
      batch.map(([dateStr, data]) => {
        const date = new Date(dateStr + 'T00:00:00.000Z');
        const restingHr =
          data.restingHrValues.length > 0
            ? Math.round(
                data.restingHrValues.reduce((a, b) => a + b, 0) /
                  data.restingHrValues.length
              )
            : null;
        const sleepHours =
          data.sleepMinutes > 0
            ? Math.round((data.sleepMinutes / 60) * 10) / 10
            : null;

        return prisma.healthDaily.upsert({
          where: { userId_date: { userId, date } },
          create: {
            userId,
            date,
            steps: data.steps || null,
            activeCalories: data.activeCalories || null,
            restingHr,
            sleepHours,
          },
          update: {
            steps: data.steps || undefined,
            activeCalories: data.activeCalories || undefined,
            restingHr: restingHr ?? undefined,
            sleepHours: sleepHours ?? undefined,
          },
        });
      })
    );
    dailyCount += batch.length;
  }

  // Insert workouts (delete existing health workouts for this user first)
  if (result.workouts.length > 0) {
    await prisma.healthWorkout.deleteMany({
      where: { userId, source: { not: null } },
    });

    // Insert in batches
    for (let i = 0; i < result.workouts.length; i += 100) {
      const batch = result.workouts.slice(i, i + 100);
      await prisma.healthWorkout.createMany({
        data: batch.map((w) => ({
          userId,
          date: new Date(w.date + 'T00:00:00.000Z'),
          type: w.type,
          durationMin: w.durationMin || null,
          calories: w.calories || null,
          source: w.source || 'Apple Health',
        })),
      });
      workoutCount += batch.length;
    }
  }

  return { dailyCount, workoutCount };
}
