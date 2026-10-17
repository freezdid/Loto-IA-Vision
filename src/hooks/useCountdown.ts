"use client";

import { useEffect, useState } from 'react';

export interface Countdown {
  /** Human label of the next draw, e.g. "Mercredi à 20h20". */
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Preformatted compact value, e.g. "2j 05h 41m 09s". */
  compact: string;
}

const DRAW_DAYS = [1, 3, 6]; // Monday, Wednesday, Saturday
const DRAW_HOUR = 20;
const DRAW_MINUTE = 20;
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const pad = (value: number) => value.toString().padStart(2, '0');

/** Deterministic placeholder label shown before the countdown mounts. */
export const DRAW_SCHEDULE_LABEL = 'Lundi, mercredi et samedi à 20h20';

function nextDrawFrom(now: Date): Date {
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(DRAW_HOUR, DRAW_MINUTE, 0, 0);
    if (DRAW_DAYS.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  fallback.setHours(DRAW_HOUR, DRAW_MINUTE, 0, 0);
  return fallback;
}

function computeCountdown(): Countdown {
  const now = new Date();
  const next = nextDrawFrom(now);
  const diff = next.getTime() - now.getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return {
    label: `${DAY_NAMES[next.getDay()]} à ${DRAW_HOUR}h${pad(DRAW_MINUTE)}`,
    days,
    hours,
    minutes,
    seconds,
    compact: `${days > 0 ? `${days}j ` : ''}${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
  };
}

/**
 * Countdown to the next official draw (Mon / Wed / Sat, 20:20).
 * Returns `null` until mounted: the value depends on the client clock and
 * rendering it during SSR would cause a hydration mismatch.
 */
export function useCountdown(): Countdown | null {
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(computeCountdown());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return countdown;
}
