"use client";

import { motion } from 'framer-motion';
import { FlaskConical, Play } from 'lucide-react';
import type { BacktestState } from '@/hooks/useLotoEngine';

interface BacktestCardProps {
  backtest: BacktestState;
  drawCount: number;
  onRun: () => void;
}

const MATCH_LABELS: Record<number, string> = {
  0: '0 numéro',
  1: '1 numéro',
  2: '2 numéros',
  3: '3 numéros',
  4: '4 numéros',
  5: '5 numéros',
};

export function BacktestCard({ backtest, drawCount, onRun }: BacktestCardProps) {
  const { status, progress, result } = backtest;
  const maxBucket = result ? Math.max(1, ...Object.values(result.distribution)) : 1;

  return (
    <section aria-label="Backtest" className="panel flex h-full flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-black tracking-tight text-ink">
          <FlaskConical className="h-4 w-4 text-primary-soft" aria-hidden />
          Backtest honnête
        </h2>
        <p className="mt-1 text-[12px] text-muted">
          Modèle réentraîné puis rejoué sur les 50 derniers tirages, hors échantillon
        </p>
      </div>

      {status === 'running' ? (
        <div className="space-y-2 py-4">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-primary-soft">Simulation rétrospective…</span>
            <span className="tabular text-ink">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-faint">
            Le test utilise seulement les tirages antérieurs : aucun futur n’est montré au modèle.
          </p>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="tile">
              <span className="tile-label">Taux de réussite</span>
              <span className="tile-value text-success">{result.winRate.toFixed(1)}%</span>
            </div>
            <div className="tile">
              <span className="tile-label">Numéros trouvés</span>
              <span className="tile-value">{result.avgMatches.toFixed(2)} / 5</span>
            </div>
            <div className="tile">
              <span className="tile-label">Chance trouvée</span>
              <span className="tile-value">{result.chanceRate.toFixed(1)}%</span>
            </div>
            <div className="tile">
              <span className="tile-label">Meilleur match</span>
              <span className="tile-value">{result.bestMatches} / 5</span>
            </div>
          </div>

          <ul className="space-y-1.5">
            {[5, 4, 3, 2, 1, 0].map((bucket) => {
              const count = result.distribution[bucket] ?? 0;
              return (
                <li key={bucket} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 shrink-0 text-faint">{MATCH_LABELS[bucket]}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
                    <span
                      className={`block h-full rounded-full ${bucket >= 2 ? 'bg-success/70' : 'bg-white/20'}`}
                      style={{ width: `${(count / maxBucket) * 100}%` }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right font-bold tabular text-muted">{count}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-faint">
            « Réussite » = au moins 2 numéros ou la boule Chance, sur {result.testSize} tirages testés.
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-white/[0.03] px-4 py-5 text-[12px] leading-relaxed text-faint">
          Ce test réentraîne un modèle sur le passé uniquement, puis compare ses grilles aux tirages réellement sortis.
          C’est la seule mesure honnête de la qualité de l’apprentissage.
        </p>
      )}

      <button
        type="button"
        onClick={onRun}
        disabled={status === 'running' || drawCount < 120}
        className="btn-ghost mt-auto w-full text-xs"
      >
        <Play className="h-3.5 w-3.5 text-primary-soft" aria-hidden />
        {status === 'running' ? 'Test en cours…' : 'Lancer le backtest'}
      </button>
    </section>
  );
}
