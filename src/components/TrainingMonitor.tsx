"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Play, RefreshCw, Square, Zap } from 'lucide-react';
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { NeuralArchitectureMonitor } from './NeuralArchitectureMonitor';
import { TRAINING_CONFIG } from '@/lib/model';
import type { ModelSummary, TrainingState } from '@/hooks/useLotoEngine';
import type { TrainingMode } from '@/lib/types';

interface TrainingMonitorProps {
  mode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
  windowLength: number;
  onWindowChange: (value: number) => void;
  fullTraining: boolean;
  onFullTrainingChange: (value: boolean) => void;
  training: TrainingState;
  model: ModelSummary | null;
  drawCount: number;
  pendingUpdates: number;
  backend: string;
  onTrain: () => void;
  onCancel: () => void;
}

const WINDOW_OPTIONS = [8, 12, 16];

export function TrainingMonitor({
  mode,
  onModeChange,
  windowLength,
  onWindowChange,
  fullTraining,
  onFullTrainingChange,
  training,
  model,
  drawCount,
  pendingUpdates,
  backend,
  onTrain,
  onCancel,
}: TrainingMonitorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isTraining = training.status === 'running';
  const lastMetric = training.history[training.history.length - 1];
  const progress = training.totalEpochs > 0 ? Math.round((training.epoch / training.totalEpochs) * 100) : 0;
  const shownLoss = training.loss ?? lastMetric?.loss ?? null;
  const shownValLoss = training.valLoss ?? lastMetric?.valLoss ?? null;
  const bestEpoch = training.bestEpoch ?? lastMetric?.bestEpoch ?? null;
  const bestValMae = training.bestValMae ?? lastMetric?.bestValMae ?? null;
  const hasRun = training.history.length > 0 && training.status !== 'idle';

  const epochNote = isTraining
    ? 'en cours'
    : training.status === 'cancelled'
      ? 'arrêté'
      : training.status === 'error'
        ? 'interrompu'
        : training.status === 'done'
          ? training.stoppedEarly
            ? 'arrêt anticipé'
            : 'terminé'
          : '';

  const runSummary = !isTraining && hasRun
    ? training.status === 'cancelled'
      ? `Entraînement arrêté à ${training.epoch}/${training.totalEpochs} époques · modèle partiel conservé`
      : training.status === 'error'
        ? 'Entraînement interrompu · relancez pour réessayer'
        : training.stoppedEarly
          ? `Arrêt anticipé à ${training.epoch}/${training.totalEpochs} · meilleure époque ${bestEpoch ?? '—'} · le meilleur checkpoint est conservé`
          : `Entraînement terminé · ${training.epoch}/${training.totalEpochs} époques${
              bestEpoch !== null ? ` · meilleur checkpoint époque ${bestEpoch}` : ''
            }`
    : null;

  const maeLabel = bestValMae !== null ? `MAE validation ${bestValMae.toFixed(3)}` : null;

  return (
    <section aria-label="Studio d'entraînement" className="panel space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-ink">Studio d’entraînement</h2>
          <p className="mt-1 text-[13px] text-muted">
            Réseau LSTM entraîné sur {drawCount > 0 ? drawCount.toLocaleString('fr-FR') : '—'} tirages réels
          </p>
        </div>
        <span
          className={`chip shrink-0 ${
            isTraining
              ? 'bg-primary/15 text-primary-soft'
              : model
                ? training.status === 'cancelled' || training.status === 'error'
                  ? 'bg-white/5 text-muted'
                  : 'bg-success/15 text-success'
                : 'bg-white/5 text-faint'
          }`}
        >
          {isTraining
            ? 'Entraînement'
            : model
              ? training.status === 'cancelled' || training.status === 'error'
                ? 'Modèle partiel'
                : 'Modèle prêt'
              : 'Non entraîné'}
        </span>
      </div>

      <NeuralArchitectureMonitor mode={mode} windowLength={windowLength} isTraining={isTraining} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="tile">
          <span className="tile-label">Époque</span>
          <span className="tile-value">
            {training.epoch > 0 ? `${training.epoch}/${training.totalEpochs}` : `0/${training.totalEpochs}`}
          </span>
          {epochNote && (
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
              {epochNote}
            </span>
          )}
        </div>
        <div className="tile">
          <span className="tile-label">Perte</span>
          <span className="tile-value">{shownLoss !== null ? shownLoss.toFixed(4) : '—'}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Validation</span>
          <span className="tile-value">{shownValLoss !== null ? shownValLoss.toFixed(4) : '—'}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Taux d’apprentissage</span>
          <span className="tile-value">{training.learningRate.toExponential(1)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-muted">Courbe d’apprentissage</span>
          <span className="tabular text-faint">
            {training.history.length > 0 ? `${training.history.length} époques mesurées` : 'en attente'}
          </span>
        </div>

        <div className="h-40 rounded-xl bg-white/[0.03] p-2">
          {training.history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={training.history} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f7df6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2f7df6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="epoch" stroke="#3b4a63" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#3b4a63" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#060e20',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#9fb0c9' }}
                  labelFormatter={(value) => `Époque ${value}`}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toFixed(4) : String(value ?? ''),
                    name === 'loss' ? 'Perte' : 'Validation',
                  ]}
                />
                <Area type="monotone" dataKey="loss" stroke="#2f7df6" strokeWidth={2} fill="url(#lossFill)" isAnimationActive={false} />
                <Line type="monotone" dataKey="valLoss" stroke="#ffd100" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[13px] font-semibold text-muted">Aucune courbe pour l’instant</p>
              <p className="mt-1 max-w-xs text-[11px] text-faint">
                Lancez un apprentissage : la perte et la validation se dessinent en direct, époque par époque.
              </p>
            </div>
          )}
        </div>
      </div>

      {runSummary && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[11px] leading-relaxed text-muted"
        >
          <span className="font-bold text-ink">{runSummary}</span>
          {maeLabel && <span className="tabular text-faint">· {maeLabel}</span>}
        </div>
      )}

      {isTraining && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-primary-soft">Progression</span>
            <span className="tabular text-ink">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mode d'entraînement">
          {(Object.keys(TRAINING_CONFIG) as TrainingMode[]).map((key) => {
            const config = TRAINING_CONFIG[key];
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onModeChange(key)}
                disabled={isTraining}
                aria-pressed={active}
                className={`rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                  active ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-white/5 hover:bg-white/8'
                }`}
              >
                <span className={`flex items-center gap-1.5 text-[13px] font-extrabold ${active ? 'text-primary-soft' : 'text-muted'}`}>
                  {key === 'fast' ? <Zap className="h-3.5 w-3.5" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                  {config.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-faint">{config.tagline}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onTrain}
            disabled={isTraining || drawCount === 0}
            className="btn-primary flex-1"
          >
            {isTraining ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {isTraining
              ? `Époque ${training.epoch}/${training.totalEpochs}…`
              : model
                ? 'Affiner le modèle'
                : 'Entraîner le modèle'}
            {!isTraining && pendingUpdates > 0 && (
              <span className="chip bg-chance/20 text-chance">
                {pendingUpdates.toLocaleString('fr-FR')} nouveau{pendingUpdates > 1 ? 'x' : ''}
              </span>
            )}
          </button>

          {isTraining && (
            <button type="button" onClick={onCancel} className="btn-ghost">
              <Square className="h-3.5 w-3.5" aria-hidden />
              Arrêter
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs font-bold text-faint transition-colors hover:text-muted"
        >
          Réglages avancés
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden />
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-xl bg-white/[0.03] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted">Politique d’arrêt</p>
                <p className="text-[11px] text-faint">
                  Complet : toutes les époques. Anticipé : stoppe si la validation stagne.
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5" role="group" aria-label="Politique d'arrêt">
                <button
                  type="button"
                  onClick={() => onFullTrainingChange(true)}
                  aria-pressed={fullTraining}
                  disabled={isTraining}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    fullTraining ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  Complet
                </button>
                <button
                  type="button"
                  onClick={() => onFullTrainingChange(false)}
                  aria-pressed={!fullTraining}
                  disabled={isTraining}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    !fullTraining ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  Anticipé
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted">Fenêtre d’analyse</p>
                <p className="text-[11px] text-faint">Nombre de tirages passés lus par le réseau</p>
              </div>
              <div className="flex gap-1.5" role="group" aria-label="Fenêtre d'analyse">
                {WINDOW_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onWindowChange(value)}
                    aria-pressed={windowLength === value}
                    disabled={isTraining}
                    className={`rounded-lg px-3 py-1.5 text-xs font-extrabold tabular transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      windowLength === value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-faint">
              Backend de calcul <span className="font-bold text-muted">{backend}</span> · changer la fenêtre reconstruit
              l’architecture, l’entraînement suivant repart de zéro.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
