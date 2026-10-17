"use client";

import Link from 'next/link';
import { Brain, CalendarDays, RefreshCw, Trophy } from 'lucide-react';
import type { Countdown } from '@/hooks/useCountdown';
import { DRAW_SCHEDULE_LABEL } from '@/hooks/useCountdown';

interface AppHeaderProps {
  backend: string;
  syncLabel: string;
  refreshLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  countdown: Countdown | null;
}

export function AppHeader({ backend, syncLabel, refreshLabel, isRefreshing, onRefresh, countdown }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-deep shadow-[0_10px_22px_-14px_rgba(47,125,246,1)]">
            <Brain className="h-5 w-5 text-white" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-base font-black tracking-tight text-ink">
              Loto <span className="text-primary-soft">IA</span> Vision
            </p>
            <p className="hidden text-[11px] font-medium text-faint sm:block">
              Studio d’analyse LSTM · {syncLabel}
            </p>
          </div>
          <span className="chip ml-1 hidden border border-line text-primary-soft sm:inline-flex">{backend}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs lg:flex">
            <span className="text-faint">Prochain tirage</span>
            <span className="font-extrabold tabular text-ink">{countdown?.compact ?? '—'}</span>
            <span className="text-faint">· {countdown?.label ?? DRAW_SCHEDULE_LABEL}</span>
          </div>

          <Link href="/journal" className="btn-ghost px-3 py-2 text-xs">
            <Trophy className="h-4 w-4 text-chance" aria-hidden />
            <span className="hidden md:inline">Journal</span>
          </Link>

          <Link href="/history" className="btn-ghost px-3 py-2 text-xs">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">Archives</span>
          </Link>

          <button type="button" onClick={onRefresh} disabled={isRefreshing} className="btn-ghost px-3 py-2 text-xs">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary-soft' : ''}`} aria-hidden />
            <span className="hidden sm:inline">{refreshLabel || 'Actualiser'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
