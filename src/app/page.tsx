"use client";

import { useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BacktestCard } from '@/components/BacktestCard';
import { GridAuditor } from '@/components/GridAuditor';
import { HeatmapCard } from '@/components/HeatmapCard';
import { KpiStrip } from '@/components/KpiStrip';
import { PredictionHero } from '@/components/PredictionHero';
import { Toast } from '@/components/Toast';
import { TrainingMonitor } from '@/components/TrainingMonitor';
import { VariantsList } from '@/components/VariantsList';
import { useCountdown } from '@/hooks/useCountdown';
import { useLotoEngine } from '@/hooks/useLotoEngine';
import { formatDrawDate } from '@/lib/dates';

export default function StudioPage() {
  const engine = useLotoEngine();
  const countdown = useCountdown();

  const rangeLabel = useMemo(() => {
    if (engine.draws.length === 0) return 'Historique en cours de chargement';
    const first = engine.draws[0];
    const last = engine.draws[engine.draws.length - 1];
    const short = { month: 'short', year: 'numeric' } as const;
    return `${formatDrawDate(first.fullDate, short)} → ${formatDrawDate(last.fullDate, short)}`;
  }, [engine.draws]);

  const lastMetric = engine.training.history[engine.training.history.length - 1];
  const validationLoss = engine.training.bestValLoss ?? lastMetric?.valLoss ?? null;
  const primaryGrid = engine.grids[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <Toast toast={engine.toast} />

      <AppHeader
        backend={engine.backend}
        syncLabel={engine.syncLabel}
        refreshLabel={engine.refreshLabel}
        isRefreshing={engine.isRefreshing}
        onRefresh={() => void engine.refreshDraws()}
        countdown={countdown}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <KpiStrip
          drawCount={engine.draws.length}
          rangeLabel={rangeLabel}
          model={engine.model}
          hasStoredModel={engine.hasStoredModel}
          loss={validationLoss}
          training={engine.training.status === 'running'}
          countdown={countdown}
        />

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <PredictionHero
              grid={primaryGrid}
              booted={engine.booted}
              hasModel={engine.model !== null}
              drawCount={engine.draws.length}
              isGenerating={engine.isGenerating}
              generationProgress={engine.generationProgress}
              onGenerate={() => void engine.generate()}
              onCopy={(numbers, chance) => void engine.copyGrid(numbers, chance)}
              onTrain={() => void engine.train()}
            />

            <VariantsList
              grids={engine.grids}
              gridCount={engine.gridCount}
              onGridCountChange={engine.setGridCount}
              onCopy={(numbers, chance) => void engine.copyGrid(numbers, chance)}
              isGenerating={engine.isGenerating}
              onGenerate={() => void engine.generate()}
            />
          </div>

          <div className="lg:col-span-5">
            <TrainingMonitor
              mode={engine.mode}
              onModeChange={engine.setMode}
              windowLength={engine.windowLength}
              onWindowChange={engine.setWindowLength}
              training={engine.training}
              model={engine.model}
              drawCount={engine.draws.length}
              pendingUpdates={engine.pendingUpdates}
              backend={engine.backend}
              onTrain={() => void engine.train()}
              onCancel={engine.cancelTraining}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <GridAuditor profile={engine.profile} onCopy={(numbers, chance) => void engine.copyGrid(numbers, chance)} />
          <BacktestCard backtest={engine.backtest} drawCount={engine.draws.length} onRun={() => void engine.runBacktest()} />
          <HeatmapCard frequencies={engine.frequencies} totalDraws={engine.draws.length} />
        </div>
      </main>

      <footer className="mt-4 border-t border-line px-4 py-8 text-center sm:px-6 lg:px-8">
        <p className="mx-auto max-w-2xl text-[12px] leading-relaxed text-faint">
          Loto IA Vision est un laboratoire d’analyse statistique indépendant. Les tirages sont aléatoires : aucune
          méthode ne garantit un gain. Les jeux d’argent comportent des risques — endettement, isolement, dépendance.
          Besoin d’aide ? Appelez le 09 74 75 13 13 (appel non surtaxé).
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-[11px] text-faint/80">
          Application non affiliée, non liée et non sponsorisée par La Française des Jeux (FDJ).
        </p>
      </footer>
    </div>
  );
}
