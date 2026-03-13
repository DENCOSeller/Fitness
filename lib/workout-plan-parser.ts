export interface ParsedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds?: number;
}

// Convert tool_use input to ParsedExercise array
export function toolUseToParsedExercises(
  input: { exercises: { name: string; sets: number; reps: number; weight_kg?: number; rest_seconds?: number }[] },
): ParsedExercise[] {
  return input.exercises.map(ex => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight_kg ?? 0,
    restSeconds: ex.rest_seconds,
  }));
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

    // Pattern 4: Markdown table row "| Name | 3 | 12 |" or "| Name | 3 | 12 | 60 кг |"
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
      // Skip header/separator rows
      if (cells.length >= 3 && !cells[1].match(/^[-:]+$/) && cells[0].length > 1) {
        const name = cells[0].replace(/\*\*/g, '');
        const setsVal = parseInt(cells[1]);
        const repsVal = parseInt(cells[2]);
        if (name && !isNaN(setsVal) && !isNaN(repsVal) && setsVal > 0 && repsVal > 0) {
          let weight = 0;
          if (cells[3]) {
            const wMatch = cells[3].match(/(\d+(?:[.,]\d+)?)/);
            if (wMatch) weight = parseFloat(wMatch[1].replace(',', '.'));
          }
          exercises.push({ name, sets: setsVal, reps: repsVal, weight });
          continue;
        }
      }
    }
  }

  return exercises.length >= 2 ? exercises : null;
}
