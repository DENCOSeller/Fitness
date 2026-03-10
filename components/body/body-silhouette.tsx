'use client';

import type { MeasurementZone } from '@/lib/measurement-types';

type ZoneData = {
  value: number | null;
  delta: number | null;
};

type Props = {
  zones: Record<MeasurementZone, ZoneData>;
  activeZone: MeasurementZone | null;
  onZoneClick: (zone: MeasurementZone) => void;
};

// Zone dot positions on the body (relative to viewBox 0 0 340 490)
// Body is centered at x=170. Labels go left or right.
const ZONE_POINTS: Record<MeasurementZone, {
  cx: number;
  cy: number;
  label: string;
  labelSide: 'left' | 'right';
}> = {
  neck:     { cx: 170, cy: 78,  label: 'Шея',      labelSide: 'right' },
  shoulder: { cx: 128, cy: 115, label: 'Плечо',    labelSide: 'left' },
  chest:    { cx: 170, cy: 140, label: 'Грудь',    labelSide: 'right' },
  waist:    { cx: 170, cy: 180, label: 'Талия',    labelSide: 'left' },
  belly:    { cx: 170, cy: 210, label: 'Живот',    labelSide: 'right' },
  hips:     { cx: 170, cy: 240, label: 'Бёдра',    labelSide: 'left' },
  glutes:   { cx: 170, cy: 263, label: 'Ягодицы',  labelSide: 'right' },
  thigh:    { cx: 150, cy: 325, label: 'Бедро',    labelSide: 'left' },
  calf:     { cx: 152, cy: 410, label: 'Голень',   labelSide: 'left' },
};

function getZoneColor(data: ZoneData): string {
  if (data.value === null) return '#8E8E93';
  if (data.delta === null) return '#0A84FF';
  if (data.delta < 0) return '#30D158';
  if (data.delta > 0) return '#FF453A';
  return '#0A84FF';
}

export default function BodySilhouette({ zones, activeZone, onZoneClick }: Props) {
  return (
    <svg viewBox="0 0 340 490" className="w-full max-w-[340px] mx-auto" style={{ height: 'auto' }}>
      {/* Body silhouette — centered at x=170 */}
      {/* Head */}
      <path
        d="M170 25 C158 25, 152 33, 152 45 C152 57, 158 67, 170 67 C182 67, 188 57, 188 45 C188 33, 182 25, 170 25 Z"
        fill="#2C2C2E" stroke="#48484A" strokeWidth="1"
      />
      {/* Neck */}
      <path d="M162 67 L162 85 L178 85 L178 67" fill="#2C2C2E" stroke="#48484A" strokeWidth="1"/>
      {/* Torso */}
      <path
        d="M162 85 L130 100 L112 115 L112 135 L125 135 L130 180 L132 215 L135 245 L142 265 L150 273 L170 277 L190 273 L198 265 L205 245 L208 215 L210 180 L215 135 L228 135 L228 115 L210 100 L178 85 Z"
        fill="#2C2C2E" stroke="#48484A" strokeWidth="1"
      />
      {/* Left arm */}
      <path
        d="M112 115 L102 145 L98 175 L96 205 L98 235 L102 240 L106 235 L108 205 L112 175 L118 145 L125 135"
        fill="#2C2C2E" stroke="#48484A" strokeWidth="1"
      />
      {/* Right arm */}
      <path
        d="M228 115 L238 145 L242 175 L244 205 L242 235 L238 240 L234 235 L232 205 L228 175 L222 145 L215 135"
        fill="#2C2C2E" stroke="#48484A" strokeWidth="1"
      />
      {/* Left leg */}
      <path
        d="M150 273 L144 305 L142 345 L144 385 L146 415 L144 445 L142 465 L138 473 L156 473 L158 463 L158 445 L156 415 L156 385 L160 345 L165 305 L170 277"
        fill="#2C2C2E" stroke="#48484A" strokeWidth="1"
      />
      {/* Right leg */}
      <path
        d="M190 273 L196 305 L198 345 L196 385 L194 415 L196 445 L198 465 L202 473 L184 473 L182 463 L182 445 L184 415 L184 385 L180 345 L175 305 L170 277"
        fill="#2C2C2E" stroke="#48484A" strokeWidth="1"
      />

      {/* Horizontal guide lines + dots + labels */}
      {(Object.entries(ZONE_POINTS) as [MeasurementZone, typeof ZONE_POINTS[MeasurementZone]][]).map(([zone, pos]) => {
        const data = zones[zone];
        const color = getZoneColor(data);
        const isActive = activeZone === zone;
        const isLeft = pos.labelSide === 'left';

        // Line and text positions
        const lineEndX = isLeft ? 30 : 310;
        const textX = isLeft ? 27 : 313;
        const anchor = isLeft ? 'end' : 'start';

        return (
          <g
            key={zone}
            onClick={() => onZoneClick(zone)}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
          >
            {/* Tap target */}
            <circle cx={pos.cx} cy={pos.cy} r="20" fill="transparent" />

            {/* Dashed connector line from dot to label */}
            <line
              x1={pos.cx + (isLeft ? -8 : 8)}
              y1={pos.cy}
              x2={lineEndX}
              y2={pos.cy}
              stroke={isActive ? color : '#48484A'}
              strokeWidth="0.7"
              strokeDasharray={isActive ? 'none' : '3 2'}
              opacity={isActive ? 0.8 : 0.5}
            />

            {/* Pulse ring when active */}
            {isActive && (
              <circle cx={pos.cx} cy={pos.cy} r="14" fill="none" stroke={color} strokeWidth="2" opacity="0.4">
                <animate attributeName="r" from="10" to="20" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Dot */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={isActive ? 8 : 5}
              fill={color}
              stroke={isActive ? '#FFF' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isActive ? 2 : 1}
              className="transition-all duration-200"
            />

            {/* Zone name label */}
            <text
              x={textX}
              y={pos.cy - 4}
              textAnchor={anchor}
              fontSize="11"
              fill={isActive ? '#FFFFFF' : '#AEAEB2'}
              fontWeight={isActive ? '600' : '400'}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              {pos.label}
            </text>

            {/* Value below name */}
            {data.value !== null ? (
              <text
                x={textX}
                y={pos.cy + 10}
                textAnchor={anchor}
                fontSize="12"
                fill={color}
                fontWeight="700"
                fontFamily="-apple-system, system-ui, sans-serif"
              >
                {data.value} см
                {data.delta !== null && data.delta !== 0 && (
                  <tspan fill={data.delta < 0 ? '#30D158' : '#FF453A'} fontSize="10" fontWeight="500">
                    {' '}{data.delta > 0 ? '+' : ''}{data.delta}
                  </tspan>
                )}
              </text>
            ) : (
              <text
                x={textX}
                y={pos.cy + 10}
                textAnchor={anchor}
                fontSize="10"
                fill="#636366"
                fontFamily="-apple-system, system-ui, sans-serif"
              >
                нет данных
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
