import sax from 'sax';
import { Readable } from 'stream';

// Apple Health XML record types we care about
const STEP_TYPE = 'HKQuantityTypeIdentifierStepCount';
const ACTIVE_CALORIES_TYPE = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const RESTING_HR_TYPE = 'HKQuantityTypeIdentifierRestingHeartRate';
const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis';

// Workout type mapping from Apple Health identifiers
const WORKOUT_TYPE_MAP: Record<string, string> = {
  HKWorkoutActivityTypeRunning: 'Бег',
  HKWorkoutActivityTypeWalking: 'Ходьба',
  HKWorkoutActivityTypeCycling: 'Велосипед',
  HKWorkoutActivityTypeSwimming: 'Плавание',
  HKWorkoutActivityTypeYoga: 'Йога',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'Силовая',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'Силовая',
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 'HIIT',
  HKWorkoutActivityTypePilates: 'Пилатес',
  HKWorkoutActivityTypeElliptical: 'Эллипс',
  HKWorkoutActivityTypeRowing: 'Гребля',
  HKWorkoutActivityTypeCrossTraining: 'Кросс-тренинг',
  HKWorkoutActivityTypeMixedCardio: 'Кардио',
  HKWorkoutActivityTypeCoreTraining: 'Кор',
  HKWorkoutActivityTypeStairClimbing: 'Лестница',
  HKWorkoutActivityTypeDance: 'Танцы',
  HKWorkoutActivityTypeSoccer: 'Футбол',
  HKWorkoutActivityTypeBasketball: 'Баскетбол',
  HKWorkoutActivityTypeTennis: 'Теннис',
  HKWorkoutActivityTypeBadminton: 'Бадминтон',
  HKWorkoutActivityTypeBoxing: 'Бокс',
  HKWorkoutActivityTypeMartialArts: 'Единоборства',
  HKWorkoutActivityTypeOther: 'Другое',
};

export type DailyData = {
  steps: number;
  activeCalories: number;
  restingHrValues: number[];
  sleepMinutes: number;
};

export type WorkoutData = {
  date: string;
  type: string;
  durationMin: number;
  calories: number;
  source: string;
};

export type ImportResult = {
  dailyRecords: Map<string, DailyData>;
  workouts: WorkoutData[];
  totalRecordsProcessed: number;
};

export type ProgressCallback = (info: {
  recordsProcessed: number;
  phase: string;
}) => void;

function extractDate(dateStr: string): string {
  // Apple Health dates: "2024-01-15 08:30:00 +0300"
  return dateStr.substring(0, 10);
}

function getOrCreateDaily(map: Map<string, DailyData>, date: string): DailyData {
  let d = map.get(date);
  if (!d) {
    d = { steps: 0, activeCalories: 0, restingHrValues: [], sleepMinutes: 0 };
    map.set(date, d);
  }
  return d;
}

export function parseAppleHealthXml(
  stream: Readable,
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(false, { lowercase: true });
    const dailyRecords = new Map<string, DailyData>();
    const workouts: WorkoutData[] = [];
    let totalRecordsProcessed = 0;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    if (onProgress) {
      progressInterval = setInterval(() => {
        onProgress({
          recordsProcessed: totalRecordsProcessed,
          phase: 'Парсинг XML...',
        });
      }, 500);
    }

    parser.on('opentag', (node) => {
      const tag = node.name;
      const attrs = node.attributes as Record<string, string>;

      if (tag === 'record') {
        totalRecordsProcessed++;
        const type = attrs.type;
        const value = parseFloat(attrs.value);
        const startDate = attrs.startdate;
        const endDate = attrs.enddate;

        if (!startDate) return;
        const date = extractDate(startDate);

        if (type === STEP_TYPE && !isNaN(value)) {
          const d = getOrCreateDaily(dailyRecords, date);
          d.steps += Math.round(value);
        } else if (type === ACTIVE_CALORIES_TYPE && !isNaN(value)) {
          const d = getOrCreateDaily(dailyRecords, date);
          d.activeCalories += Math.round(value);
        } else if (type === RESTING_HR_TYPE && !isNaN(value)) {
          const d = getOrCreateDaily(dailyRecords, date);
          d.restingHrValues.push(value);
        } else if (type === SLEEP_TYPE && endDate) {
          // Sleep analysis: value "HKCategoryValueSleepAnalysisAsleepUnspecified", "InBed", etc.
          const sleepValue = attrs.value;
          // Only count actual sleep, not "InBed"
          if (sleepValue && !sleepValue.includes('InBed')) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const minutes = (end.getTime() - start.getTime()) / 60000;
            if (minutes > 0 && minutes < 1440) {
              const d = getOrCreateDaily(dailyRecords, date);
              d.sleepMinutes += minutes;
            }
          }
        }
      } else if (tag === 'workout') {
        totalRecordsProcessed++;
        const workoutType = attrs.workoutactivitytype || '';
        const startDate = attrs.startdate;
        const durationStr = attrs.duration;
        const caloriesStr = attrs.totalenergyburnedquantity || attrs.totalenergyburned;
        const source = attrs.sourcename || '';

        if (!startDate) return;
        const date = extractDate(startDate);
        const durationMin = durationStr ? Math.round(parseFloat(durationStr)) : 0;
        const calories = caloriesStr ? Math.round(parseFloat(caloriesStr)) : 0;
        const type = WORKOUT_TYPE_MAP[workoutType] || workoutType.replace('HKWorkoutActivityType', '') || 'Другое';

        workouts.push({ date, type, durationMin, calories, source });
      }
    });

    parser.on('error', (err) => {
      if (progressInterval) clearInterval(progressInterval);
      // SAX errors on malformed XML are common in Apple Health exports
      // Try to continue - resolve with what we have
      parser.resume();
    });

    parser.on('end', () => {
      if (progressInterval) clearInterval(progressInterval);
      resolve({ dailyRecords, workouts, totalRecordsProcessed });
    });

    stream.pipe(parser);

    stream.on('error', (err) => {
      if (progressInterval) clearInterval(progressInterval);
      reject(err);
    });
  });
}
