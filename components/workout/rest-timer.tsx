'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DURATIONS = [30, 60, 90, 120];

interface RestTimerProps {
  onClose: () => void;
}

export default function RestTimer({ onClose }: RestTimerProps) {
  const [duration, setDuration] = useState(90);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (isRunning || timeLeft === 0 ? progress : 0) / 100);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const finish = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Sound via AudioContext
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playBeep = (time: number, freq: number) => {
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
      playBeep(ctx.currentTime, 880);
      playBeep(ctx.currentTime + 0.2, 880);
      playBeep(ctx.currentTime + 0.4, 1100);
    } catch {
      // AudioContext not available
    }
  }, []);

  const start = useCallback((sec: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDuration(sec);
    setTimeLeft(sec);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, finish]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-text font-medium text-sm">Таймер отдыха</span>
        <button
          onClick={() => { handleStop(); onClose(); }}
          className="text-text-secondary hover:text-text text-xs transition-colors"
        >
          Скрыть
        </button>
      </div>

      {/* Circular progress + time */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="6"
            />
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="currentColor"
              className="text-accent transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-text text-3xl font-bold tabular-nums">
              {isRunning ? formatTime(timeLeft) : formatTime(duration)}
            </span>
            {timeLeft === 0 && !isRunning && duration > 0 && (
              <span className="text-accent text-xs mt-0.5">Готово!</span>
            )}
          </div>
        </div>
      </div>

      {/* Duration buttons */}
      <div className="flex gap-2 justify-center">
        {DURATIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => start(sec)}
            className={`px-3 py-1.5 text-sm rounded-xl transition-colors ${
              duration === sec && isRunning
                ? 'bg-accent text-white'
                : 'bg-bg text-text-secondary hover:text-text'
            }`}
          >
            {sec}с
          </button>
        ))}
      </div>

      {/* Stop button when running */}
      {isRunning && (
        <button
          onClick={handleStop}
          className="w-full text-danger text-sm py-2 hover:bg-danger/10 rounded-xl transition-colors"
        >
          Остановить
        </button>
      )}
    </div>
  );
}
