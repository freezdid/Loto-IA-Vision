"use client";

import { Activity, Clock3, Cpu, Database } from 'lucide-react';
import type { ModelSummary } from '@/hooks/useLotoEngine';
import type { Countdown } from '@/hooks/useCountdown';
import { DRAW_SCHEDULE_LABEL } from '@/hooks/useCountdown';
import { TRAINING_CONFIG } from '@/lib/model';

interface KpiStripProps {
  drawCount: number;
  rangeLabel: string;
  model: ModelSummary | null;
  hasStoredModel: boolean;
  loss: number | null;
  training: boolean;
  countdown: Countdown | null;
}

function formatParams(params: number): string {
  return params >= 1000 ? `${(params / 1000).toFixed(1)}k` : `${params}`;
}

export function KpiStrip({ drawCount, rangeLabel, model, hasStoredModel, loss, training, countdown }: KpiStripProps) {
  const tiles = [
    {
      icon: Database,
      label: 'Tirages analysés',
      value: drawCount > 0 ? drawCount.toLocaleString('fr-FR') : '—',
      hint: rangeLabel,
    },
    {
      icon: Cpu,
      label: 'Modèle',
      value: model ? `${formatParams(model.params)}` : hasStoredModel ? 'Chargement' : 'Aucun',
      hint: model
        ? `${TRAINING_CONFIG[model.mode].label} · fenêtre ${model.window}`
        : 'Entraînement requis',
    },
    {
      icon: Activity,
      label: 'Erreur (MAE)',
      value: loss !== null ? loss.toFixed(3) : '—',
      hint: training ? 'Apprentissage en cours' : 'Validation sur 10 % du corpus',
    },
    {
      icon: Clock3,
      label: 'Prochain tirage',
      value: countdown?.compact ?? '—',
      hint: countdown?.label ?? DRAW_SCHEDULE_LABEL,
    },
  ];

  return (
    <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, hint }) => (
        <div key={label} className="panel flex items-center gap-3 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-primary-soft">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-faint">{label}</p>
            <p className="truncate text-sm font-extrabold tabular text-ink">{value}</p>
            <p className="text-[11px] leading-tight text-faint">{hint}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
