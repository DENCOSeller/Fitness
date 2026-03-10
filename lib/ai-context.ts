import { calculateAge } from '@/lib/user-helpers';
import { ZONE_LABELS, type MeasurementZone } from '@/lib/measurement-types';

const GOAL_LABELS: Record<string, string> = {
  loss: 'похудение',
  gain: 'набор массы',
  maintain: 'поддержание формы',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'сидячий',
  light: 'лёгкая активность',
  moderate: 'средняя активность',
  active: 'высокая активность',
};

export interface FullUserProfile {
  name?: string | null;
  gender?: string | null;
  birthDate?: Date | string | null;
  height?: number | null;
  goal?: string | null;
  targetWeight?: number | null;
  activityLevel?: string | null;
}

export interface LatestBodyMetric {
  weight?: number | null;
  bodyFatPct?: number | null;
  muscleMass?: number | null;
  bmi?: number | null;
  waterPct?: number | null;
  bmr?: number | null;
  metabolicAge?: number | null;
}

export interface LatestMeasurement {
  neck?: number | null;
  chest?: number | null;
  shoulder?: number | null;
  waist?: number | null;
  belly?: number | null;
  hips?: number | null;
  glutes?: number | null;
  thigh?: number | null;
  calf?: number | null;
}

export function formatProfileLine(user: FullUserProfile | null | undefined): string | null {
  if (!user) return null;
  const parts: string[] = [];
  if (user.name) parts.push(user.name);
  if (user.gender) parts.push(user.gender === 'female' ? 'женщина' : 'мужчина');
  const age = calculateAge(user.birthDate);
  if (age) parts.push(`${age} лет`);
  if (user.height) parts.push(`рост ${user.height} см`);
  if (user.goal) parts.push(`цель: ${GOAL_LABELS[user.goal] || user.goal}`);
  if (user.targetWeight) parts.push(`целевой вес: ${user.targetWeight} кг`);
  if (user.activityLevel) parts.push(`активность: ${ACTIVITY_LABELS[user.activityLevel] || user.activityLevel}`);
  return parts.length > 0 ? `Пользователь: ${parts.join(', ')}` : null;
}

export function formatPicoocLine(metric: LatestBodyMetric | null | undefined): string | null {
  if (!metric) return null;
  const parts: string[] = [];
  if (metric.weight) parts.push(`вес ${metric.weight} кг`);
  if (metric.bodyFatPct) parts.push(`жир ${metric.bodyFatPct}%`);
  if (metric.muscleMass) parts.push(`мышцы ${metric.muscleMass} кг`);
  if (metric.bmi) parts.push(`ИМТ ${metric.bmi}`);
  if (metric.waterPct) parts.push(`вода ${metric.waterPct}%`);
  if (metric.bmr) parts.push(`BMR ${metric.bmr} ккал`);
  if (metric.metabolicAge) parts.push(`метаболический возраст ${metric.metabolicAge}`);
  return parts.length > 0 ? `Состав тела (Picooc): ${parts.join(', ')}` : null;
}

export function formatMeasurementsLine(m: LatestMeasurement | null | undefined): string | null {
  if (!m) return null;
  const zones: MeasurementZone[] = ['neck', 'chest', 'shoulder', 'waist', 'belly', 'hips', 'glutes', 'thigh', 'calf'];
  const parts: string[] = [];
  for (const zone of zones) {
    const val = m[zone];
    if (val) parts.push(`${ZONE_LABELS[zone].toLowerCase()} ${val} см`);
  }
  return parts.length > 0 ? `Замеры тела: ${parts.join(', ')}` : null;
}

export function buildFullContextBlock(
  user: FullUserProfile | null | undefined,
  picooc: LatestBodyMetric | null | undefined,
  measurements: LatestMeasurement | null | undefined,
): string {
  const lines = [
    formatProfileLine(user),
    formatPicoocLine(picooc),
    formatMeasurementsLine(measurements),
  ].filter(Boolean);
  return lines.join('\n');
}
