'use client';

import { useMemo } from 'react';

// Baseline measurements for an average person (175cm)
const BASE = {
  height: 175,
  neck: 38,
  shoulder: 45,
  chest: 95,
  waist: 85,
  belly: 90,
  hips: 95,
  glutes: 98,
  thigh: 55,
  calf: 35,
};

// Maximum pixel shift per zone
const MAX_SHIFT = 30;

type Measurements = {
  neck?: number | null;
  shoulder?: number | null;
  chest?: number | null;
  waist?: number | null;
  belly?: number | null;
  hips?: number | null;
  glutes?: number | null;
  thigh?: number | null;
  calf?: number | null;
};

type Props = {
  measurements: Measurements;
  height?: number | null;
  label?: string;
  muted?: boolean;
};

// Calculate shift in px based on deviation from baseline
function calcShift(value: number | null | undefined, base: number): number {
  if (value == null) return 0;
  const deviation = (value - base) / base; // e.g. 100cm vs 85cm = +0.176
  const shift = deviation * 60; // scale factor — 60px per 100% deviation
  return Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift));
}

// SVG body path builder with morphable control points
function buildBodyPath(m: Measurements): string {
  const neck = calcShift(m.neck, BASE.neck);
  const shoulder = calcShift(m.shoulder, BASE.shoulder);
  const chest = calcShift(m.chest, BASE.chest);
  const waist = calcShift(m.waist, BASE.waist);
  const belly = calcShift(m.belly, BASE.belly);
  const hips = calcShift(m.hips, BASE.hips);
  const glutes = calcShift(m.glutes, BASE.glutes);
  const thigh = calcShift(m.thigh, BASE.thigh);
  const calf = calcShift(m.calf, BASE.calf);

  // Center x = 100, total viewBox width = 200
  // Build right half, then mirror for left
  // Y coordinates (approx for 175cm person in 380px viewBox):
  // Head top: 10, Head bottom/neck start: 55, Neck bottom: 70
  // Shoulders: 85, Chest: 110, Waist: 155, Belly: 180
  // Hips: 210, Glutes: 225, Crotch: 245
  // Mid-thigh: 280, Knee: 310, Calf: 340, Ankle: 370, Foot: 380

  // Right side control points (x offsets from center=100)
  const neckW = 9 + neck * 0.5;
  const shoulderW = 42 + shoulder;
  const chestW = 35 + chest;
  const waistW = 28 + waist;
  const bellyW = 30 + belly;
  const hipW = 33 + hips;
  const gluteW = 34 + glutes;
  const thighW = 20 + thigh;
  const kneeW = 14 + thigh * 0.3;
  const calfW = 14 + calf;
  const ankleW = 7;

  const cx = 100; // center x

  // Build path: start from top of head, go right side down, then left side up
  // Head (circle-ish shape)
  const headR = 16;
  const headCy = 30;

  // Right side path (from neck down to foot)
  const rightPath = [
    // Neck right
    `L ${cx + neckW} 60`,
    // Neck to shoulder
    `C ${cx + neckW} 70, ${cx + neckW + 5} 75, ${cx + shoulderW} 85`,
    // Shoulder to arm connection
    `L ${cx + shoulderW + 8} 88`,
    // Deltoid curve down
    `C ${cx + shoulderW + 10} 95, ${cx + shoulderW + 5} 100, ${cx + shoulderW} 105`,
    // Arm outer (simplified — just show body contour, not full arm)
    // Shoulder to chest transition
    `C ${cx + shoulderW - 2} 108, ${cx + chestW + 3} 110, ${cx + chestW} 115`,
    // Chest area
    `C ${cx + chestW} 125, ${cx + chestW - 2} 140, ${cx + waistW + 3} 150`,
    // Waist
    `C ${cx + waistW} 155, ${cx + waistW} 160, ${cx + bellyW} 170`,
    // Belly
    `C ${cx + bellyW + 2} 180, ${cx + bellyW + 2} 190, ${cx + hipW} 200`,
    // Hips
    `C ${cx + hipW + 2} 208, ${cx + gluteW} 215, ${cx + gluteW} 225`,
    // Glutes to thigh
    `C ${cx + gluteW} 232, ${cx + thighW + 8} 240, ${cx + thighW + 5} 250`,
    // Upper thigh
    `C ${cx + thighW + 3} 260, ${cx + thighW} 275, ${cx + thighW - 2} 290`,
    // Thigh to knee
    `C ${cx + thighW - 3} 300, ${cx + kneeW + 2} 305, ${cx + kneeW} 310`,
    // Knee
    `C ${cx + kneeW - 1} 315, ${cx + kneeW - 2} 320, ${cx + calfW} 330`,
    // Calf
    `C ${cx + calfW + 1} 340, ${cx + calfW} 350, ${cx + calfW - 2} 355`,
    // Calf to ankle
    `C ${cx + calfW - 4} 360, ${cx + ankleW + 3} 365, ${cx + ankleW} 370`,
    // Ankle to foot
    `L ${cx + ankleW} 375`,
    `L ${cx + ankleW + 5} 380`,
    // Foot bottom
    `L ${cx + 2} 380`,
  ];

  // Left side path (mirror — from left foot up to neck)
  const leftPath = [
    // Left foot
    `L ${cx - 2} 380`,
    `L ${cx - ankleW - 5} 380`,
    `L ${cx - ankleW} 375`,
    // Ankle to calf
    `L ${cx - ankleW} 370`,
    `C ${cx - ankleW - 3} 365, ${cx - calfW + 4} 360, ${cx - calfW + 2} 355`,
    // Calf
    `C ${cx - calfW} 350, ${cx - calfW - 1} 340, ${cx - calfW} 330`,
    // Knee
    `C ${cx - kneeW + 2} 320, ${cx - kneeW + 1} 315, ${cx - kneeW} 310`,
    // Knee to thigh
    `C ${cx - kneeW - 2} 305, ${cx - thighW + 3} 300, ${cx - thighW + 2} 290`,
    // Upper thigh
    `C ${cx - thighW} 275, ${cx - thighW - 3} 260, ${cx - thighW - 5} 250`,
    // Thigh to glutes
    `C ${cx - thighW - 8} 240, ${cx - gluteW} 232, ${cx - gluteW} 225`,
    // Glutes
    `C ${cx - gluteW} 215, ${cx - hipW - 2} 208, ${cx - hipW} 200`,
    // Hips to belly
    `C ${cx - bellyW - 2} 190, ${cx - bellyW - 2} 180, ${cx - bellyW} 170`,
    // Belly to waist
    `C ${cx - waistW} 160, ${cx - waistW} 155, ${cx - waistW - 3} 150`,
    // Waist to chest
    `C ${cx - chestW + 2} 140, ${cx - chestW} 125, ${cx - chestW} 115`,
    // Chest to shoulder
    `C ${cx - chestW - 3} 110, ${cx - shoulderW + 2} 108, ${cx - shoulderW} 105`,
    // Shoulder arm
    `C ${cx - shoulderW - 5} 100, ${cx - shoulderW - 10} 95, ${cx - shoulderW - 8} 88`,
    `L ${cx - shoulderW} 85`,
    // Shoulder to neck
    `C ${cx - neckW - 5} 75, ${cx - neckW} 70, ${cx - neckW} 60`,
  ];

  // Full outer body path
  const headPath = `M ${cx} ${headCy - headR} C ${cx + headR} ${headCy - headR}, ${cx + headR} ${headCy + headR}, ${cx + neckW} 55 L ${cx + neckW} 60`;
  const neckToLeft = `L ${cx - neckW} 60 L ${cx - neckW} 55 C ${cx - headR} ${headCy + headR}, ${cx - headR} ${headCy - headR}, ${cx} ${headCy - headR}`;

  return `${headPath} ${rightPath.join(' ')} ${leftPath.join(' ')} ${neckToLeft} Z`;
}

// Build inner leg cutout path
function buildInnerLegsPath(m: Measurements): string {
  const thigh = calcShift(m.thigh, BASE.thigh);
  const calf = calcShift(m.calf, BASE.calf);
  const cx = 100;
  const legGap = 4;

  const innerThigh = Math.max(legGap, (20 + thigh) * 0.3 + legGap);
  const innerKnee = Math.max(legGap, (14 + thigh * 0.3) * 0.3 + legGap);
  const innerCalf = Math.max(legGap, (14 + calf) * 0.3 + legGap);

  return [
    `M ${cx + innerThigh} 245`,
    `L ${cx + innerThigh} 260`,
    `C ${cx + innerThigh - 2} 280, ${cx + innerKnee} 305, ${cx + innerKnee} 310`,
    `C ${cx + innerKnee} 315, ${cx + innerCalf + 1} 330, ${cx + innerCalf} 340`,
    `C ${cx + innerCalf - 1} 350, ${cx + legGap} 360, ${cx + legGap} 370`,
    `L ${cx + 2} 375`,
    `L ${cx + 2} 380`,
    `L ${cx - 2} 380`,
    `L ${cx - 2} 375`,
    `L ${cx - legGap} 370`,
    `C ${cx - legGap} 360, ${cx - innerCalf + 1} 350, ${cx - innerCalf} 340`,
    `C ${cx - innerCalf - 1} 330, ${cx - innerKnee} 315, ${cx - innerKnee} 310`,
    `C ${cx - innerKnee} 305, ${cx - innerThigh + 2} 280, ${cx - innerThigh} 260`,
    `L ${cx - innerThigh} 245`,
    `Z`,
  ].join(' ');
}

function SingleSilhouette({ measurements, height, label, muted }: Props) {
  const heightScale = height ? height / BASE.height : 1;
  const svgHeight = Math.round(390 * heightScale);

  const bodyPath = useMemo(() => buildBodyPath(measurements), [measurements]);
  const legsPath = useMemo(() => buildInnerLegsPath(measurements), [measurements]);

  const fillColor = muted ? '#1C1C1E' : '#2C2C2E';
  const strokeColor = muted ? '#38383A' : '#48484A';
  const accentColor = muted ? '#48484A' : '#0A84FF';

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className={`text-xs font-medium mb-2 ${muted ? 'text-[#636366]' : 'text-[#8E8E93]'}`}>
          {label}
        </span>
      )}
      <svg
        viewBox="0 0 200 390"
        className="w-full max-w-[160px]"
        style={{ height: svgHeight }}
      >
        <defs>
          <linearGradient id={`bodyGrad${muted ? 'M' : ''}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={muted ? '#2C2C2E' : '#3A3A3C'} />
            <stop offset="100%" stopColor={fillColor} />
          </linearGradient>
        </defs>

        {/* Body outline */}
        <path
          d={bodyPath}
          fill={`url(#bodyGrad${muted ? 'M' : ''})`}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="transition-all duration-700 ease-in-out"
        />

        {/* Inner legs cutout */}
        <path
          d={legsPath}
          fill="#000"
          stroke={strokeColor}
          strokeWidth="0.8"
          className="transition-all duration-700 ease-in-out"
        />

        {/* Zone indicator lines */}
        {measurements.neck != null && (
          <line x1="65" y1="62" x2="135" y2="62" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        )}
        {measurements.shoulder != null && (
          <>
            <line x1="50" y1="88" x2="85" y2="88" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
            <line x1="115" y1="88" x2="150" y2="88" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
          </>
        )}
        {measurements.chest != null && (
          <line x1="60" y1="118" x2="140" y2="118" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        )}
        {measurements.waist != null && (
          <line x1="65" y1="155" x2="135" y2="155" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        )}
        {measurements.belly != null && (
          <line x1="63" y1="178" x2="137" y2="178" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        )}
        {measurements.hips != null && (
          <line x1="60" y1="205" x2="140" y2="205" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        )}
        {measurements.glutes != null && (
          <line x1="60" y1="225" x2="140" y2="225" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        )}
        {measurements.thigh != null && (
          <>
            <line x1="75" y1="280" x2="100" y2="280" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
            <line x1="100" y1="280" x2="125" y2="280" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
          </>
        )}
        {measurements.calf != null && (
          <>
            <line x1="78" y1="340" x2="100" y2="340" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
            <line x1="100" y1="340" x2="122" y2="340" stroke={accentColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
          </>
        )}
      </svg>
    </div>
  );
}

type MorphingSilhouetteProps = {
  current: Measurements;
  previous?: Measurements | null;
  height?: number | null;
};

export default function MorphingSilhouette({ current, previous, height }: MorphingSilhouetteProps) {
  const hasAnyData = Object.values(current).some(v => v != null);

  if (!hasAnyData) return null;

  const showComparison = previous && Object.values(previous).some(v => v != null);

  return (
    <div className="bg-[#1C1C1E] rounded-2xl p-4">
      <h2 className="text-sm font-medium text-[#8E8E93] mb-3">
        {showComparison ? 'Прогресс силуэта' : 'Ваш силуэт'}
      </h2>
      <div className={`flex items-end justify-center ${showComparison ? 'gap-6' : ''}`}>
        {showComparison && previous && (
          <SingleSilhouette
            measurements={previous}
            height={height}
            label="Было"
            muted
          />
        )}
        <SingleSilhouette
          measurements={current}
          height={height}
          label={showComparison ? 'Стало' : undefined}
        />
      </div>
      {height && (
        <p className="text-center text-xs text-[#636366] mt-2">
          Масштаб по росту: {height} см
        </p>
      )}
    </div>
  );
}
