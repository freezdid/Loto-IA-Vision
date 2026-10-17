"use client";

import { useMemo, useState } from 'react';
import { Copy, Dices, Gauge } from 'lucide-react';
import { BallGroup } from './LevitatingBall';
import { GridScore, StatsProfile, randomGrid, scoreGrid } from '@/lib/stats';
import { MAIN_COUNT, MAX_CHANCE, MAX_MAIN, MIN_CHANCE, MIN_MAIN, clamp } from '@/lib/loto';

interface GridAuditorProps {
  profile: StatsProfile | null;
  onCopy: (numbers: number[], chance: number) => void;
}

const DEFAULT_GRID = [7, 14, 22, 33, 45, 8];

/** Type your own grid and see instantly how typical it is. */
export function GridAuditor({ profile, onCopy }: GridAuditorProps) {
  const [values, setValues] = useState<number[]>(DEFAULT_GRID);

  const scoreResult: GridScore | null = useMemo(
    () => (profile ? scoreGrid(values, profile) : null),
    [profile, values],
  );

  const duplicates = useMemo(() => {
    const main = values.slice(0, MAIN_COUNT);
    return new Set(main).size !== main.length;
  }, [values]);

  const updateValue = (index: number, rawValue: string) => {
    const max = index === MAIN_COUNT ? MAX_CHANCE : MAX_MAIN;
    const min = index === MAIN_COUNT ? MIN_CHANCE : MIN_MAIN;
    const parsed = Number.parseInt(rawValue, 10);
    const next = [...values];
    next[index] = Number.isFinite(parsed) ? clamp(parsed, min, max) : min;
    setValues(next);
  };

  return (
    <section aria-label="Audit de grille" className="panel flex h-full flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-black tracking-tight text-ink">
            <Gauge className="h-4 w-4 text-primary-soft" aria-hidden />
            Audit de grille
          </h2>
          <p className="mt-1 text-[12px] text-muted">Testez vos numéros, le score se met à jour en direct</p>
        </div>
        {scoreResult && (
          <span
            className={`chip shrink-0 ${
              scoreResult.score >= 75
                ? 'bg-success/15 text-success'
                : scoreResult.score >= 55
                  ? 'bg-primary/15 text-primary-soft'
                  : 'bg-white/5 text-muted'
            }`}
          >
            {scoreResult.score}%
          </span>
        )}
      </div>

      <div className="rounded-xl bg-white/[0.03] py-4">
        <BallGroup
          numbers={values.slice(0, MAIN_COUNT)}
          chance={values[MAIN_COUNT]}
          size="sm"
          revealSeed={values.join('-')}
        />
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {values.map((value, index) => (
          <input
            key={index}
            type="number"
            inputMode="numeric"
            min={index === MAIN_COUNT ? MIN_CHANCE : MIN_MAIN}
            max={index === MAIN_COUNT ? MAX_CHANCE : MAX_MAIN}
            value={value}
            onChange={(event) => updateValue(index, event.target.value)}
            aria-label={index === MAIN_COUNT ? 'Numéro chance' : `Numéro ${index + 1}`}
            className={`w-full rounded-lg bg-white/5 py-2 text-center text-sm font-extrabold tabular text-ink outline-none transition-colors hover:bg-white/8 focus:bg-white/8 ${
              index === MAIN_COUNT ? 'text-chance' : ''
            }`}
          />
        ))}
      </div>

      {duplicates && (
        <p className="text-[11px] font-semibold text-danger">
          Deux numéros identiques : une grille ne contient pas de doublon.
        </p>
      )}

      {scoreResult && !duplicates && (
        <ul className="space-y-1.5">
          {scoreResult.reasons.length > 0 ? (
            scoreResult.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-[12px] text-muted">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {reason}
              </li>
            ))
          ) : (
            <li className="text-[12px] text-muted">
              Aucun pattern fort : cette grille s’écarte des régularités de l’historique.
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex gap-2">
        <button type="button" onClick={() => setValues(randomGrid())} className="btn-ghost flex-1 text-xs">
          <Dices className="h-3.5 w-3.5 text-primary-soft" aria-hidden />
          Grille au hasard
        </button>
        <button
          type="button"
          onClick={() => onCopy(values.slice(0, MAIN_COUNT), values[MAIN_COUNT])}
          className="btn-ghost flex-1 text-xs"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copier
        </button>
      </div>
    </section>
  );
}
