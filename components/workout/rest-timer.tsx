'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const DURATIONS = [60, 90, 120];
const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSeconds?: number;
}

function getStrokeColor(pct: number): string {
  if (pct > 50) return '#30D158';
  if (pct > 20) return '#FF9F0A';
  return '#FF453A';
}

function playFinishSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const beep = (time: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      osc.start(time);
      osc.stop(time + 0.15);
    };
    beep(ctx.currentTime, 880);
    beep(ctx.currentTime + 0.2, 880);
    beep(ctx.currentTime + 0.4, 1100);
  } catch { /* AudioContext not available */ }
}

export default function RestTimer({ isOpen, onClose, defaultSeconds = 90 }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const startTimeRef = useRef(0);
  const totalRef = useRef(defaultSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    cleanup();
    finishedRef.current = false;
    startTimeRef.current = Date.now();
    totalRef.current = seconds;
    setTotalSeconds(seconds);
    setRemaining(seconds);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, totalRef.current - elapsed);
      setRemaining(left);

      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        playFinishSound();
      }
    }, 250);
  }, [cleanup]);

  // Auto-start when opened
  useEffect(() => {
    if (isOpen) {
      startTimer(defaultSeconds);
    } else {
      cleanup();
    }
    return cleanup;
  }, [isOpen, defaultSeconds, startTimer, cleanup]);

  const handleDurationChange = (sec: number) => {
    startTimer(sec);
  };

  const handleAddTime = () => {
    totalRef.current += 30;
    setTotalSeconds(totalRef.current);
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setRemaining(Math.max(0, totalRef.current - elapsed));
    finishedRef.current = false;
  };

  const handleSkip = () => {
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  const strokeColor = getStrokeColor(pct);
  const dashOffset = CIRCUMFERENCE * (1 - pct / 100);
  const finished = remaining <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm flex flex-col items-center justify-center px-4">
      {/* Duration selector */}
      <div className="flex gap-3 mb-10">
        {DURATIONS.map(sec => (
          <button key={sec} onClick={() => handleDurationChange(sec)}
            className={`px-5 py-2 text-sm font-medium rounded-xl transition-all ${
              totalSeconds === sec
                ? 'bg-white/15 text-white'
                : 'text-text-secondary hover:text-white'
            }`}
          >{sec}с</button>
        ))}
      </div>

      {/* Circle + timer */}
      <div className="relative w-52 h-52 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={RADIUS}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"
          />
          <circle cx="100" cy="100" r={RADIUS}
            fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-mono font-bold tabular-nums" style={{ fontSize: '72px', lineHeight: 1 }}>
            {remaining}
          </span>
        </div>
      </div>

      <p className="text-text-secondary text-sm mb-10">
        {finished ? 'Время вышло!' : 'Отдых'}
      </p>

      {/* +30s button */}
      {!finished && (
        <button onClick={handleAddTime}
          className="mb-6 px-6 py-2 text-sm font-medium text-text-secondary bg-white/10 rounded-xl hover:bg-white/15 transition-colors"
        >+30с</button>
      )}

      {/* Skip / Close */}
      <button onClick={handleSkip}
        className="w-full max-w-xs py-3.5 text-base font-semibold rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-colors"
      >
        {finished ? 'Закрыть' : 'Пропустить'}
      </button>
    </div>
  );
}
