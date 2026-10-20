"use client";

import { Copy, Layers } from 'lucide-react';
import { BallGroup } from './LevitatingBall';
import type { PredictionGrid } from '@/lib/predict';

interface VariantsListProps {
  grids: PredictionGrid[];
  gridCount: number;
  onGridCountChange: (count: number) => void;
  onCopy: (numbers: number[], chance: number) => void;
  isGenerating: boolean;
  onGenerate: (count?: number) => void;
}

const COUNT_OPTIONS = [1, 2, 3, 5];

export function VariantsList({ grids, gridCount, onGridCountChange, onCopy, isGenerating, onGenerate }: VariantsListProps) {
  const variants = grids.slice(1, gridCount);
  const coveredGrids = grids.slice(0, Math.max(1, gridCount));
  const coveredNumbers = new Set(coveredGrids.flatMap((grid) => grid.numbers)).size;
  const coveredChances = new Set(coveredGrids.map((grid) => grid.chance)).size;

  return (
    <section aria-label="Autres grilles" className="panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-black tracking-tight text-ink">
            <Layers className="h-4 w-4 text-primary-soft" aria-hidden />
            Autres grilles
          </h2>
          <p className="mt-1 text-[12px] text-muted">Combinaisons complémentaires, classées par conformité</p>
          {coveredGrids.length > 1 && (
            <p className="mt-1 text-[11px] tabular text-faint">
              {coveredNumbers} numéros distincts ·{' '}
              {coveredChances > 1 ? `${coveredChances} boules Chance différentes` : '1 boule Chance'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Nombre de grilles">
          <span className="mr-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Grilles</span>
          {COUNT_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onGridCountChange(value);
                if (value > 1) onGenerate(value);
              }}
              aria-pressed={gridCount === value}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold tabular transition-colors ${
                gridCount === value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {variants.length > 0 ? (
        <ul className="space-y-2.5">
          {variants.map((grid, index) => (
            <li
              key={`${grid.numbers.join('-')}-${grid.chance}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black tabular text-faint">#{index + 2}</span>
                <BallGroup numbers={grid.numbers} chance={grid.chance} size="sm" />
              </div>

              <div className="flex items-center gap-2">
                <span className="chip bg-white/5 text-muted">Somme {grid.analysis.sum}</span>
                <span className={`chip ${grid.score >= 75 ? 'bg-success/15 text-success' : 'bg-white/5 text-muted'}`}>
                  {grid.score}%
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(grid.numbers, grid.chance)}
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                  aria-label={`Copier la grille ${index + 2}`}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white/[0.03] px-4 py-5 text-center text-[12px] text-faint">
          {isGenerating
            ? 'Génération en cours…'
            : 'Passez à 2 grilles ou plus pour générer des combinaisons complémentaires.'}
        </p>
      )}
    </section>
  );
}
