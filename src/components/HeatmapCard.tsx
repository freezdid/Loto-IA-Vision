"use client";

import { Flame, Snowflake } from 'lucide-react';
import { FrequencyAnalysis } from '@/lib/stats';

interface HeatmapCardProps {
  frequencies: FrequencyAnalysis | null;
  totalDraws: number;
}

/** Which numbers the history keeps returning — and which ones it forgets. */
export function HeatmapCard({ frequencies, totalDraws }: HeatmapCardProps) {
  const hot = frequencies?.hotNumbers.slice(0, 8) ?? [];
  const cold = frequencies?.coldNumbers.slice(0, 4) ?? [];
  const maxCount = frequencies?.maxCount ?? 1;

  return (
    <section aria-label="Chaleur des numéros" className="panel flex h-full flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-black tracking-tight text-ink">
          <Flame className="h-4 w-4 text-primary-soft" aria-hidden />
          Numéros chauds &amp; froids
        </h2>
        <p className="mt-1 text-[12px] text-muted">
          Sur {totalDraws > 0 ? totalDraws.toLocaleString('fr-FR') : '—'} tirages réels
        </p>
      </div>

      {frequencies ? (
        <>
          <ul className="space-y-2">
            {hot.map((value, index) => {
              const count = frequencies.counts[value] ?? 0;
              return (
                <li key={value} className="flex items-center gap-2.5">
                  <span className="number-ball-sm shrink-0">{value}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-primary/80 to-primary/30"
                      style={{ width: `${Math.max(6, (count / maxCount) * 100)}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-[11px] font-bold tabular text-muted">
                    {count}× <span className="text-faint">#{index + 1}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line pt-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
              <Snowflake className="h-3.5 w-3.5" aria-hidden />
              Les plus rares
            </p>
            <div className="mt-2 flex items-center gap-2">
              {cold.map((value) => (
                <span key={value} className="number-ball-sm opacity-70">
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-line pt-3.5">
            <span className="text-[12px] font-semibold text-muted">Boules Chance les plus sorties</span>
            <span className="flex gap-1.5">
              {frequencies.topChances.map((value) => (
                <span key={value} className="number-ball-sm chance">
                  {value}
                </span>
              ))}
            </span>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-white/[0.03] px-4 py-5 text-center text-[12px] text-faint">
          Les fréquences apparaîtront dès que l’historique sera chargé.
        </p>
      )}
    </section>
  );
}
