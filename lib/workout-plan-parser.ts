export interface ParsedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

// Parse AI trainer response to extract workout plan
export function parseWorkoutPlan(text: string): ParsedExercise[] | null {
  const exercises: ParsedExercise[] = [];

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove list markers and bold
    let clean = trimmed
      .replace(/^[-•*]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/\*\*/g, '');

    // Pattern 1: "Name — NxM, Wкг" or "Name — N×M, W кг"
    let match = clean.match(/^(.+?)\s*[—–-]\s*(\d+)\s*[×xXхХ]\s*(\d+)(?:.*?(\d+(?:[.,]\d+)?)\s*кг)?/);
    if (match) {
      exercises.push({
        name: match[1].trim(),
        sets: parseInt(match[2]),
        reps: parseInt(match[3]),
        weight: match[4] ? parseFloat(match[4].replace(',', '.')) : 0,
      });
      continue;
    }

    // Pattern 2: "Name: N подходов по M повторений"
    match = clean.match(/^(.+?)\s*[:—–-]\s*(\d+)\s*подход\S*\s*(?:по\s*)?(\d+)(?:\s*(?:повтор|раз))?(?:.*?(\d+(?:[.,]\d+)?)\s*кг)?/i);
    if (match) {
      exercises.push({
        name: match[1].trim(),
        sets: parseInt(match[2]),
        reps: parseInt(match[3]),
        weight: match[4] ? parseFloat(match[4].replace(',', '.')) : 0,
      });
      continue;
    }

    // Pattern 3: "Name — N подходов × M"
    match = clean.match(/^(.+?)\s*[—–-]\s*(\d+)\s*подход\S*\s*[×xXхХ]\s*(\d+)(?:.*?(\d+(?:[.,]\d+)?)\s*кг)?/i);
    if (match) {
      exercises.push({
        name: match[1].trim(),
        sets: parseInt(match[2]),
        reps: parseInt(match[3]),
        weight: match[4] ? parseFloat(match[4].replace(',', '.')) : 0,
      });
      continue;
    }
  }

  return exercises.length >= 2 ? exercises : null;
}
