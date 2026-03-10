'use client';

import type { MeasurementZone } from '@/app/(dashboard)/body/measurements-actions';

type ZoneData = {
  value: number | null;
  delta: number | null; // vs previous measurement
};

type Props = {
  zones: Record<MeasurementZone, ZoneData>;
  activeZone: MeasurementZone | null;
  onZoneClick: (zone: MeasurementZone) => void;
};

// Zone positions on the silhouette (cx, cy relative to viewBox 0 0 200 480)
const ZONE_POINTS: Record<MeasurementZone, { cx: number; cy: number; label: string }> = {
  neck:     { cx: 100, cy: 72,  label: 'Шея' },
  shoulder: { cx: 58,  cy: 110, label: 'Плечо' },
  chest:    { cx: 100, cy: 135, label: 'Грудь' },
  waist:    { cx: 100, cy: 175, label: 'Талия' },
  belly:    { cx: 100, cy: 205, label: 'Живот' },
  hips:     { cx: 100, cy: 235, label: 'Бёдра' },
  glutes:   { cx: 100, cy: 258, label: 'Ягодицы' },
  thigh:    { cx: 80,  cy: 320, label: 'Бедро' },
  calf:     { cx: 82,  cy: 405, label: 'Голень' },
};

function getZoneColor(data: ZoneData): string {
  if (data.value === null) return '#8E8E93'; // gray
  if (data.delta === null) return '#0A84FF'; // blue — first measurement
  if (data.delta < 0) return '#30D158'; // green — improvement (smaller)
  if (data.delta > 0) return '#FF453A'; // red — increased
  return '#0A84FF'; // unchanged
}

export default function BodySilhouette({ zones, activeZone, onZoneClick }: Props) {
  return (
    <svg viewBox="0 0 200 480" className="w-full max-w-[240px] mx-auto" style={{ height: 'auto' }}>
      {/* Body silhouette outline */}
      <path
        d={`
          M 100 20
          C 88 20, 82 28, 82 40
          C 82 52, 88 62, 100 62
          C 112 62, 118 52, 118 40
          C 118 28, 112 20, 100 20
          Z
        `}
        fill="#2C2C2E"
        stroke="#48484A"
        strokeWidth="1"
      />
      {/* Neck */}
      <path d="M 92 62 L 92 80 L 108 80 L 108 62" fill="#2C2C2E" stroke="#48484A" strokeWidth="1"/>
      {/* Torso */}
      <path
        d={`
          M 92 80
          L 60 95
          L 42 110
          L 42 130
          L 55 130
          L 60 175
          L 62 210
          L 65 240
          L 72 260
          L 80 268
          L 100 272
          L 120 268
          L 128 260
          L 135 240
          L 138 210
          L 140 175
          L 145 130
          L 158 130
          L 158 110
          L 140 95
          L 108 80
          Z
        `}
        fill="#2C2C2E"
        stroke="#48484A"
        strokeWidth="1"
      />
      {/* Left arm */}
      <path
        d={`
          M 42 110
          L 32 140
          L 28 170
          L 26 200
          L 28 230
          L 32 235
          L 36 230
          L 38 200
          L 42 170
          L 48 140
          L 55 130
        `}
        fill="#2C2C2E"
        stroke="#48484A"
        strokeWidth="1"
      />
      {/* Right arm */}
      <path
        d={`
          M 158 110
          L 168 140
          L 172 170
          L 174 200
          L 172 230
          L 168 235
          L 164 230
          L 162 200
          L 158 170
          L 152 140
          L 145 130
        `}
        fill="#2C2C2E"
        stroke="#48484A"
        strokeWidth="1"
      />
      {/* Left leg */}
      <path
        d={`
          M 80 268
          L 74 300
          L 72 340
          L 74 380
          L 76 410
          L 74 440
          L 72 460
          L 68 468
          L 86 468
          L 88 458
          L 88 440
          L 86 410
          L 86 380
          L 90 340
          L 95 300
          L 100 272
        `}
        fill="#2C2C2E"
        stroke="#48484A"
        strokeWidth="1"
      />
      {/* Right leg */}
      <path
        d={`
          M 120 268
          L 126 300
          L 128 340
          L 126 380
          L 124 410
          L 126 440
          L 128 460
          L 132 468
          L 114 468
          L 112 458
          L 112 440
          L 114 410
          L 114 380
          L 110 340
          L 105 300
          L 100 272
        `}
        fill="#2C2C2E"
        stroke="#48484A"
        strokeWidth="1"
      />

      {/* Measurement zone dots */}
      {(Object.entries(ZONE_POINTS) as [MeasurementZone, typeof ZONE_POINTS[MeasurementZone]][]).map(([zone, pos]) => {
        const data = zones[zone];
        const color = getZoneColor(data);
        const isActive = activeZone === zone;

        return (
          <g
            key={zone}
            onClick={() => onZoneClick(zone)}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
          >
            {/* Tap target (invisible larger circle) */}
            <circle cx={pos.cx} cy={pos.cy} r="18" fill="transparent" />
            {/* Pulse ring when active */}
            {isActive && (
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r="14"
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity="0.4"
              >
                <animate attributeName="r" from="10" to="18" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Dot */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={isActive ? 8 : 6}
              fill={color}
              stroke={isActive ? '#FFF' : 'none'}
              strokeWidth="2"
              className="transition-all duration-200"
            />
            {/* Value label */}
            {data.value !== null && (
              <text
                x={pos.cx + (pos.cx < 100 ? -16 : 16)}
                y={pos.cy + 4}
                textAnchor={pos.cx < 100 ? 'end' : 'start'}
                fontSize="10"
                fill="#FFFFFF"
                fontWeight="600"
              >
                {data.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
