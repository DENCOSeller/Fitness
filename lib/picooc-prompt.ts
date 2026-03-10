export function buildPicoocPrompt(profileContext?: string): string {
  const profileBlock = profileContext ? `\n\n${profileContext}\n` : '';
  return `Ты анализируешь скриншот из приложения Picooc (умные весы для анализа состава тела).
Скриншот на русском языке.${profileBlock}

Извлеки следующие метрики тела со скриншота. Верни ТОЛЬКО валидный JSON-объект с этими полями:

{
  "weight": <число в кг, например 75.5>,
  "bodyFatPct": <число, процент жира, например 18.5>,
  "muscleMass": <число, процент мышц, например 45.2>,
  "waterPct": <число, процент воды, например 55.3>,
  "leanMass": <число в кг, безжировая масса тела, например 62.1>,
  "bmr": <число в ккал, основной обмен веществ / СООВ, например 1650>,
  "bmi": <число, индекс массы тела, например 23.1>,
  "metabolicAge": <число, метаболический возраст, например 28>,
  "comment": "<краткий комментарий: оценка показателей с учётом профиля пользователя, 1-2 предложения>"
}

Правила:
- Извлекай числа точно так, как они показаны на экране
- Если значение не видно или нечитаемо, используй null для этого поля
- НЕ придумывай значения — извлекай только то, что чётко видно
- Верни ТОЛЬКО JSON-объект, без другого текста или markdown
- Используй десятичные числа (не строки)
- Поле "muscleMass" — это процент мышечной массы (%), не килограммы
- Поле "leanMass" — это безжировая масса в килограммах
- Поле "bmr" — это основной обмен веществ (СООВ) в ккал
- В "comment" дай краткую оценку показателей с учётом данных пользователя (пол, возраст, цель)`;
}

// Keep for backward compatibility
export const PICOOC_PARSE_PROMPT = buildPicoocPrompt();

export interface PicoocData {
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  bmi: number | null;
  waterPct: number | null;
  leanMass: number | null;
  bmr: number | null;
  metabolicAge: number | null;
  comment?: string | null;
}

export function validatePicoocData(data: PicoocData): string[] {
  const errors: string[] = [];

  if (data.weight !== null && (data.weight < 30 || data.weight > 300)) {
    errors.push(`Вес ${data.weight} кг вне допустимого диапазона (30–300)`);
  }
  if (data.bodyFatPct !== null && (data.bodyFatPct < 3 || data.bodyFatPct > 60)) {
    errors.push(`Жир ${data.bodyFatPct}% вне допустимого диапазона (3–60)`);
  }
  if (data.muscleMass !== null && (data.muscleMass < 10 || data.muscleMass > 80)) {
    errors.push(`Мышцы ${data.muscleMass}% вне допустимого диапазона (10–80)`);
  }
  if (data.bmi !== null && (data.bmi < 10 || data.bmi > 50)) {
    errors.push(`ИМТ ${data.bmi} вне допустимого диапазона (10–50)`);
  }
  if (data.waterPct !== null && (data.waterPct < 20 || data.waterPct > 80)) {
    errors.push(`Вода ${data.waterPct}% вне допустимого диапазона (20–80)`);
  }
  if (data.leanMass !== null && (data.leanMass < 20 || data.leanMass > 150)) {
    errors.push(`Безжировая масса ${data.leanMass} кг вне допустимого диапазона (20–150)`);
  }
  if (data.bmr !== null && (data.bmr < 500 || data.bmr > 5000)) {
    errors.push(`СООВ ${data.bmr} ккал вне допустимого диапазона (500–5000)`);
  }
  if (data.metabolicAge !== null && (data.metabolicAge < 10 || data.metabolicAge > 100)) {
    errors.push(`Метаболический возраст ${data.metabolicAge} вне допустимого диапазона (10–100)`);
  }

  return errors;
}
