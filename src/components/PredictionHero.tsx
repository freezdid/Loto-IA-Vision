"use client";

import { motion } from 'framer-motion';
import { Copy, Play, Sparkles, Target } from 'lucide-react';
import { BallGroup } from './LevitatingBall';
import { SpatialCard } from './SpatialCard';
import type { PredictionGrid } from '@/lib/predict';

interface PredictionHeroProps {
  grid: PredictionGrid | null;
  booted: boolean;
  hasModel: boolean;
  drawCount: number;
  isGenerating: boolean;
  generationProgress: number;
  onGenerate: () => void;
  onCopy: (numbers: number[], chance: number) => void;
  onTrain: () => void;
}

function scoreTone(score: number): string {
  if (score >= 75) return 'bg-success/15 text-success';
  if (score >= 55) return 'bg-primary/15 text-primary-soft';
  return 'bg-white/5 text-muted';
}

export function PredictionHero({
  grid,
  booted,
  hasModel,
  drawCount,
  isGenerating,
  generationProgress,
  onGenerate,
  onCopy,
  onTrain,
}: PredictionHeroProps) {
  return (
    <SpatialCard className="p-5 sm:p-7" glow="rgba(47, 125, 246, 0.2)" ariaLabel="Grille proposée">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-ink">
            <Target className="h-5 w-5 text-primary-soft" aria-hidden />
            Grille proposée
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            La combinaison la plus conforme aux patterns de l’historique réel
          </p>
        </div>

        {grid && (
          <span className={`chip ${scoreTone(grid.score)}`} title="Proximité statistique avec l'historique, pas une probabilité de gain">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Conformité {grid.score}%
          </span>
        )}
      </div>

      <div className="py-7 sm:py-9">
        {!booted ? (
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="skeleton h-14 w-14 rounded-full" />
            ))}
          </div>
        ) : grid ? (
          <BallGroup
            numbers={grid.numbers}
            chance={grid.chance}
            levitate
            revealSeed={`${grid.numbers.join('-')}-${grid.chance}`}
          />
        ) : (
          <div className="mx-auto max-w-md text-center">
            <p className="text-[15px] font-bold text-ink">
              {hasModel ? 'Aucune grille affichée' : drawCount === 0 ? 'Commencez par charger les tirages' : 'Le modèle attend son premier entraînement'}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {hasModel
                ? 'Lancez une génération pour obtenir une grille classée par conformité statistique.'
                : 'Le réseau lit les tirages passés, apprend leurs régularités puis propose une combinaison. Tout se passe dans votre navigateur.'}
            </p>
            <button
              type="button"
              onClick={hasModel ? onGenerate : onTrain}
              disabled={drawCount === 0 || isGenerating}
              className="btn-primary mx-auto mt-4"
            >
              {hasModel ? <Sparkles className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {hasModel ? 'Générer une grille' : 'Entraîner le modèle'}
            </button>
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="mb-5 space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-primary-soft">Analyse des séquences…</span>
            <span className="tabular text-muted">{generationProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
              animate={{ width: `${generationProgress}%` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {grid && (
        <div className="space-y-4 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            <span className={`chip ${grid.analysis.sumStatus === 'Optimal' ? 'bg-success/15 text-success' : 'bg-white/5 text-muted'}`}>
              Somme {grid.analysis.sum} · {grid.analysis.sumStatus}
            </span>
            <span className={`chip ${grid.analysis.balanceStatus === 'Équilibré' ? 'bg-primary/15 text-primary-soft' : 'bg-white/5 text-muted'}`}>
              {grid.analysis.evens} pairs / {grid.analysis.odds} impairs
            </span>
            <span className={`chip ${grid.analysis.spreadStatus === 'Répartie' ? 'bg-primary/15 text-primary-soft' : 'bg-white/5 text-muted'}`}>
              Écart moyen {grid.analysis.avgGap.toFixed(1)}
            </span>
          </div>

          {grid.reasons.length > 0 && (
            <ul className="space-y-1.5">
              {grid.reasons.slice(0, 2).map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-[12px] text-muted">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {reason}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onCopy(grid.numbers, grid.chance)} className="btn-primary">
              <Copy className="h-4 w-4" aria-hidden />
              Copier la grille
            </button>
            <button type="button" onClick={onGenerate} disabled={isGenerating || !hasModel} className="btn-ghost">
              <Sparkles className="h-4 w-4 text-primary-soft" aria-hidden />
              Régénérer
            </button>
            <span className="text-[11px] text-faint">Score statistique : aucun gain n’est garanti.</span>
          </div>
        </div>
      )}
    </SpatialCard>
  );
}
