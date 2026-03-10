export type MeasurementZone = 'neck' | 'chest' | 'waist' | 'belly' | 'hips' | 'glutes' | 'thigh' | 'calf' | 'shoulder';

export const ZONE_LABELS: Record<MeasurementZone, string> = {
  neck: 'Шея',
  chest: 'Грудь',
  shoulder: 'Плечо',
  waist: 'Талия',
  belly: 'Живот',
  hips: 'Бёдра',
  glutes: 'Ягодицы',
  thigh: 'Бедро',
  calf: 'Голень',
};

export const ALL_ZONES: MeasurementZone[] = ['neck', 'chest', 'shoulder', 'waist', 'belly', 'hips', 'glutes', 'thigh', 'calf'];

export type MeasurementRecord = {
  id: number;
  date: string;
  neck: number | null;
  chest: number | null;
  waist: number | null;
  belly: number | null;
  hips: number | null;
  glutes: number | null;
  thigh: number | null;
  calf: number | null;
  shoulder: number | null;
};
