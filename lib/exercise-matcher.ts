import { prisma } from '@/lib/db';

interface MatchResult {
  exerciseId: number;
  exerciseName: string;
  isNew: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()[\]{}"'«»]/g, '')
    .replace(/[^a-zа-яёA-ZА-ЯЁ0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export async function findOrCreateExercise(
  name: string,
  userId: number,
  allExercises?: { id: number; name: string }[],
): Promise<MatchResult> {
  const exercises = allExercises ?? await prisma.exercise.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    select: { id: true, name: true },
  });

  const input = normalize(name);

  // 1. Exact match
  for (const ex of exercises) {
    if (normalize(ex.name) === input) {
      return { exerciseId: ex.id, exerciseName: ex.name, isNew: false };
    }
  }

  // 2. Partial match (either direction)
  for (const ex of exercises) {
    const norm = normalize(ex.name);
    if (norm.includes(input) || input.includes(norm)) {
      return { exerciseId: ex.id, exerciseName: ex.name, isNew: false };
    }
  }

  // 3. Fuzzy match (Levenshtein, threshold > 0.7)
  let bestMatch: { id: number; name: string } | null = null;
  let bestScore = 0;

  for (const ex of exercises) {
    const score = similarity(input, normalize(ex.name));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ex;
    }
  }

  if (bestMatch && bestScore > 0.7) {
    return { exerciseId: bestMatch.id, exerciseName: bestMatch.name, isNew: false };
  }

  // 4. Not found — create new user exercise
  const created = await prisma.exercise.create({
    data: {
      userId,
      name: name.trim(),
      muscleGroup: 'Другое',
      type: 'strength',
    },
  });

  return { exerciseId: created.id, exerciseName: created.name, isNew: true };
}

export async function findOrCreateExercises(
  names: string[],
  userId: number,
): Promise<MatchResult[]> {
  const exercises = await prisma.exercise.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    select: { id: true, name: true },
  });

  const results: MatchResult[] = [];
  for (const name of names) {
    const result = await findOrCreateExercise(name, userId, exercises);
    // Add newly created exercises to the list for subsequent matches
    if (result.isNew) {
      exercises.push({ id: result.exerciseId, name: result.exerciseName });
    }
    results.push(result);
  }

  return results;
}
