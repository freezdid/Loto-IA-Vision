"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
  BacktestResult,
  EpochMetrics,
  StandardScaler,
  TRAINING_CONFIG,
  buildModel,
  buildScaledWindows,
  countTrainableParams,
  createDataset,
  initTensorFlow,
  prepareForTraining,
  processData,
  runBacktest,
  scaledLastWindow,
  trainModel,
} from '@/lib/model';
import {
  PredictionGrid,
  generatePredictions,
} from '@/lib/predict';
import { StatsProfile, buildStatsProfile, scoreGrid } from '@/lib/stats';
import { LotoDraw, ProcessedDraw, SavedPrediction, TrainingMode } from '@/lib/types';
import { mergeDraws, sanitizeDraws, sortDrawsByDate } from '@/lib/loto';
import { errorMessage } from '@/lib/errors';
import {
  hasSavedModel,
  loadDraws,
  loadLastPrediction,
  loadModel,
  loadModelMeta,
  loadPredictions,
  saveDraws,
  saveLastPrediction,
  saveModel,
  saveModelMeta,
  savePredictions,
} from '@/lib/storage';
import type { TrainingSnapshot } from '@/lib/storage';

export interface ToastState {
  message: string;
  tone: 'success' | 'info' | 'error';
}

export type TrainingStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

export interface TrainingState {
  status: TrainingStatus;
  epoch: number;
  totalEpochs: number;
  loss: number | null;
  valLoss: number | null;
  mae: number | null;
  valMae: number | null;
  bestValLoss: number | null;
  bestValMae: number | null;
  bestEpoch: number | null;
  learningRate: number;
  history: EpochMetrics[];
  stoppedEarly: boolean;
  cancelled: boolean;
  fullTraining: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  durationMs: number | null;
}

export interface ModelSummary {
  params: number;
  window: number;
  mode: TrainingMode;
  trainedAt: number | null;
  bestValLoss: number | null;
  bestValMae: number | null;
  bestEpoch: number | null;
  epochsRun: number;
  totalEpochs: number;
  stoppedEarly: boolean;
}

export interface BacktestState {
  status: 'idle' | 'running' | 'done';
  progress: number;
  result: BacktestResult | null;
}

const MAX_HISTORY = 50;

const idleTraining = (mode: TrainingMode, fullTraining = true): TrainingState => ({
  status: 'idle',
  epoch: 0,
  totalEpochs: TRAINING_CONFIG[mode].epochs,
  loss: null,
  valLoss: null,
  mae: null,
  valMae: null,
  bestValLoss: null,
  bestValMae: null,
  bestEpoch: null,
  learningRate: TRAINING_CONFIG[mode].learningRate,
  history: [],
  stoppedEarly: false,
  cancelled: false,
  fullTraining,
  startedAt: null,
  finishedAt: null,
  durationMs: null,
});

/** Restore the last run (curve, epoch count, stop reason) after a reload. */
const trainingFromSnapshot = (snapshot: TrainingSnapshot): TrainingState => {
  const last = snapshot.history[snapshot.history.length - 1];
  return {
    status: snapshot.cancelled ? 'cancelled' : 'done',
    epoch: snapshot.epochsRun,
    totalEpochs: snapshot.totalEpochs,
    loss: last?.loss ?? null,
    valLoss: last?.valLoss ?? null,
    mae: last?.mae ?? null,
    valMae: last?.valMae ?? null,
    bestValLoss: snapshot.bestValLoss,
    bestValMae: snapshot.bestValMae,
    bestEpoch: snapshot.bestEpoch,
    learningRate: last?.learningRate ?? TRAINING_CONFIG[snapshot.mode].learningRate,
    history: snapshot.history,
    stoppedEarly: snapshot.stoppedEarly,
    cancelled: snapshot.cancelled,
    fullTraining: snapshot.fullTraining,
    startedAt: snapshot.trainedAt - (snapshot.durationMs ?? 0),
    finishedAt: snapshot.trainedAt,
    durationMs: snapshot.durationMs,
  };
};

/**
 * Single source of truth for the studio: draw history, LSTM training,
 * inference, cloud sync and journaling. The UI only renders this state.
 */
export function useLotoEngine() {
  const [rawDraws, setRawDraws] = useState<LotoDraw[]>([]);
  const [draws, setDraws] = useState<ProcessedDraw[]>([]);
  const [profile, setProfile] = useState<StatsProfile | null>(null);

  const [booted, setBooted] = useState(false);
  const [backend, setBackend] = useState('Initialisation…');
  const [syncLabel, setSyncLabel] = useState('Cache local');
  const [refreshLabel, setRefreshLabel] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState(0);

  const [mode, setMode] = useState<TrainingMode>('precise');
  const [windowLength, setWindowLength] = useState(12);
  const [fullTraining, setFullTraining] = useState(true);
  const [training, setTraining] = useState<TrainingState>(() => idleTraining('precise'));
  const [model, setModel] = useState<ModelSummary | null>(null);
  const [hasStoredModel, setHasStoredModel] = useState(false);

  const [grids, setGrids] = useState<PredictionGrid[]>([]);
  const [gridCount, setGridCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [history, setHistory] = useState<SavedPrediction[]>([]);

  const [backtest, setBacktest] = useState<BacktestState>({ status: 'idle', progress: 0, result: null });
  const [toast, setToast] = useState<ToastState | null>(null);

  const modelRef = useRef<tf.LayersModel | null>(null);
  const scalerRef = useRef<StandardScaler | null>(null);
  const rawRef = useRef<LotoDraw[]>([]);
  const processedRef = useRef<ProcessedDraw[]>([]);
  const profileRef = useRef<StatsProfile | null>(null);
  const historyRef = useRef<SavedPrediction[]>([]);
  const cloudCountRef = useRef(0);
  const cancelRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const bootedRef = useRef(false);

  const notify = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  /** Replace the dataset and recompute every derived value. */
  const applyDraws = useCallback((next: LotoDraw[]) => {
    const ordered = sortDrawsByDate(sanitizeDraws(next), 'desc');
    rawRef.current = ordered;
    setRawDraws(ordered);

    const processed = processData(ordered);
    processedRef.current = processed;
    setDraws(processed);

    const nextProfile = processed.length > 0 ? buildStatsProfile(processed) : null;
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    return processed;
  }, []);

  const rememberHistory = useCallback((next: SavedPrediction[]) => {
    const trimmed = next.slice(0, MAX_HISTORY);
    historyRef.current = trimmed;
    setHistory(trimmed);
    return trimmed;
  }, []);

  const pushHistoryToCloud = useCallback(async (entries: SavedPrediction[]) => {
    try {
      const response = await fetch(`/api/sync?type=predictions&t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: entries, type: 'predictions' }),
      });
      const json = (await response.json()) as { success?: boolean };
      if (json.success) setSyncLabel('Cloud synchronisé');
    } catch {
      setSyncLabel('Cloud indisponible');
    }
  }, []);

  const pushDrawsToCloud = useCallback(async (entries: LotoDraw[]) => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: entries, type: 'draws' }),
      });
      const json = (await response.json()) as { success?: boolean };
      setSyncLabel(json.success ? 'Cloud synchronisé' : 'Cloud indisponible');
    } catch {
      setSyncLabel('Cloud indisponible');
    }
  }, []);

  // -------------------------------------------------------------------------
  // Inference
  // -------------------------------------------------------------------------

  const persistPrediction = useCallback(
    async (generated: PredictionGrid[]) => {
      const gridsAsNumbers = generated.map((grid) => [...grid.numbers, grid.chance]);
      const entry: SavedPrediction = {
        timestamp: new Date().toISOString(),
        grilles: gridsAsNumbers,
        scores: generated.map((grid) => grid.score),
      };

      const previous = historyRef.current[0];
      const isDuplicate =
        previous !== undefined &&
        previous.grilles.length === gridsAsNumbers.length &&
        gridsAsNumbers.every((grid, index) => grid.join(',') === previous.grilles[index]?.join(','));

      if (!isDuplicate) {
        const next = rememberHistory([entry, ...historyRef.current]);
        await savePredictions(next);
        void pushHistoryToCloud(next);
      }
      await saveLastPrediction(gridsAsNumbers);
    },
    [pushHistoryToCloud, rememberHistory],
  );

  const generate = useCallback(
    async (count: number = gridCount) => {
      const currentModel = modelRef.current;
      const scaler = scalerRef.current;
      const currentProfile = profileRef.current;
      if (!currentModel) {
        notify('Entraînez d’abord le modèle pour générer des grilles', 'info');
        return;
      }
      if (!scaler) {
        notify('Normalisation du modèle indisponible : relancez un entraînement', 'error');
        return;
      }
      if (!currentProfile) {
        notify('Historique insuffisant pour générer une grille', 'error');
        return;
      }

      const modelWindow = Number(currentModel.inputs[0].shape[1]) || windowLength;
      const lastWindow = scaledLastWindow(processedRef.current, modelWindow, scaler);

      setIsGenerating(true);
      setGenerationProgress(0);
      try {
        const generated = await generatePredictions({
          model: currentModel,
          lastWindow,
          scaler,
          profile: currentProfile,
          count,
          onProgress: setGenerationProgress,
        });
        if (generated.length === 0) {
          notify('Génération impossible : historique trop court', 'error');
          return;
        }
        setGrids(generated);
        await persistPrediction(generated);
      } catch (error) {
        notify(`Génération interrompue : ${errorMessage(error)}`, 'error');
      } finally {
        setIsGenerating(false);
        setGenerationProgress(0);
      }
    },
    [gridCount, notify, persistPrediction, windowLength],
  );

  // -------------------------------------------------------------------------
  // Training
  // -------------------------------------------------------------------------

  const cancelTraining = useCallback(() => {
    cancelRef.current = true;
    notify('Arrêt demandé : fin de l’époque en cours…', 'info');
  }, [notify]);

  const train = useCallback(
    async (options: { mode?: TrainingMode; silentStart?: boolean } = {}) => {
      const processed = processedRef.current;
      const trainingMode = options.mode ?? mode;

      if (processed.length < windowLength + 50) {
        notify('Pas assez de tirages pour entraîner le modèle', 'error');
        return;
      }

      cancelRef.current = false;
      const config = TRAINING_CONFIG[trainingMode];
      setTraining({ ...idleTraining(trainingMode, fullTraining), status: 'running', startedAt: Date.now() });
      await tf.nextFrame();

      try {
        let workingModel = modelRef.current;
        const modelWindow = workingModel ? Number(workingModel.inputs[0].shape[1]) : 0;
        const expectedName = trainingMode === 'fast' ? 'loto-turbo' : 'loto-elite';
        const canFineTune = Boolean(workingModel) && modelWindow === windowLength && workingModel?.name === expectedName;

        let X: number[][][];
        let Y: number[][];

        if (canFineTune && scalerRef.current) {
          // Same architecture: keep the existing normalization so the trained
          // weights stay meaningful (true fine-tuning on the new draws).
          const windows = buildScaledWindows(processed, windowLength, scalerRef.current);
          X = windows.X;
          Y = windows.Y;
        } else {
          workingModel?.dispose();
          workingModel = buildModel(trainingMode, windowLength);
          modelRef.current = workingModel;
          const dataset = createDataset(processed, windowLength, config.validationSplit);
          scalerRef.current = dataset.scaler;
          X = dataset.X;
          Y = dataset.Y;
        }

        if (!workingModel) throw new Error('Modèle indisponible');
        prepareForTraining(workingModel, trainingMode);

        const summary = await trainModel(workingModel, X, Y, trainingMode, {
          maxEpochs: config.epochs,
          allowEarlyStop: !fullTraining,
          onEpochEnd: (metrics) =>
            setTraining((previous) => ({
              ...previous,
              epoch: metrics.epoch,
              loss: metrics.loss,
              valLoss: metrics.valLoss,
              mae: metrics.mae,
              valMae: metrics.valMae,
              bestValLoss: metrics.bestValLoss,
              bestValMae: metrics.bestValMae,
              bestEpoch: metrics.bestEpoch,
              learningRate: metrics.learningRate,
              history: [...previous.history, metrics],
            })),
          shouldCancel: () => cancelRef.current,
        });

        if (summary.epochsRun === 0) {
          modelRef.current?.dispose();
          modelRef.current = null;
          setModel(null);
          setHasStoredModel(false);
          setTraining((previous) => ({
            ...previous,
            status: 'cancelled',
            cancelled: true,
            finishedAt: Date.now(),
          }));
          notify('Entraînement arrêté avant la première époque : aucun modèle enregistré', 'info');
          return;
        }

        const trainedAt = Date.now();
        const params = countTrainableParams(workingModel);
        const saved = await saveModel(workingModel);
        const snapshot: TrainingSnapshot = {
          version: 1,
          mode: trainingMode,
          window: windowLength,
          params,
          trainedAt,
          bestValLoss: summary.bestValLoss,
          bestValMae: summary.bestValMae,
          bestEpoch: summary.bestEpoch,
          epochsRun: summary.epochsRun,
          totalEpochs: summary.epochsRequested,
          stoppedEarly: summary.stoppedEarly,
          cancelled: summary.cancelled,
          fullTraining,
          durationMs: summary.durationMs,
          history: summary.history,
          scaler: scalerRef.current
            ? { means: [...scalerRef.current.means], stds: [...scalerRef.current.stds] }
            : null,
        };
        if (saved) await saveModelMeta(snapshot);

        setModel({
          params,
          window: windowLength,
          mode: trainingMode,
          trainedAt,
          bestValLoss: summary.bestValLoss,
          bestValMae: summary.bestValMae,
          bestEpoch: summary.bestEpoch,
          epochsRun: summary.epochsRun,
          totalEpochs: summary.epochsRequested,
          stoppedEarly: summary.stoppedEarly,
        });
        setHasStoredModel(saved);
        if (!summary.cancelled) setPendingUpdates(0);

        setTraining((previous) => ({
          ...previous,
          status: summary.cancelled ? 'cancelled' : 'done',
          epoch: summary.epochsRun,
          totalEpochs: summary.epochsRequested,
          loss: summary.finalLoss ?? previous.loss,
          bestValLoss: summary.bestValLoss,
          bestValMae: summary.bestValMae,
          bestEpoch: summary.bestEpoch,
          stoppedEarly: summary.stoppedEarly,
          cancelled: summary.cancelled,
          durationMs: summary.durationMs,
          finishedAt: trainedAt,
        }));

        const metric = summary.bestValMae !== null ? `, MAE validation ${summary.bestValMae.toFixed(3)}` : '';
        const early = summary.stoppedEarly ? ', arrêt anticipé' : '';
        const persistence = saved ? '' : ' · non sauvegardé';
        if (summary.cancelled) {
          notify(
            `Entraînement arrêté à ${summary.epochsRun}/${summary.epochsRequested} époques${metric}${persistence}`,
            'info',
          );
        } else {
          notify(
            `Modèle ${config.label} prêt : ${summary.epochsRun}/${summary.epochsRequested} époques${early}${metric}${persistence}`,
            saved ? 'success' : 'info',
          );
          await generate();
        }
      } catch (error) {
        setTraining((previous) => ({ ...previous, status: 'error', finishedAt: Date.now() }));
        notify(`Entraînement interrompu : ${errorMessage(error)}`, 'error');
      }
    },
    [fullTraining, generate, mode, notify, windowLength],
  );

  // -------------------------------------------------------------------------
  // Draw history
  // -------------------------------------------------------------------------

  const refreshDraws = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setRefreshLabel('Actualisation…');
      setIsRefreshing(true);
      try {
        const response = await fetch(`/api/loto?t=${Date.now()}`, { cache: 'no-store' });
        const json = (await response.json()) as { success?: boolean; results?: LotoDraw[]; error?: string };
        if (!json.success || !Array.isArray(json.results)) {
          throw new Error(json.error ?? 'Réponse invalide du serveur');
        }

        const merged = mergeDraws(json.results, rawRef.current);
        const added = merged.length - rawRef.current.length;
        applyDraws(merged);
        await saveDraws(merged);

        if (added > 0) setPendingUpdates((previous) => previous + added);
        setRefreshLabel(
          added > 0 ? `${added} nouveau${added > 1 ? 'x' : ''} tirage${added > 1 ? 's' : ''}` : 'Historique à jour',
        );
        if (added > 0 && !options.silent) {
          notify(`${added} nouveau${added > 1 ? 'x' : ''} tirage${added > 1 ? 's' : ''} importé${added > 1 ? 's' : ''}`, 'success');
        }

        if (merged.length > cloudCountRef.current) {
          cloudCountRef.current = merged.length;
          void pushDrawsToCloud(merged);
        }
      } catch (error) {
        setRefreshLabel('Hors ligne');
        setSyncLabel('Cache local');
        if (!options.silent) notify(errorMessage(error), 'error');
      } finally {
        setIsRefreshing(false);
      }
    },
    [applyDraws, notify, pushDrawsToCloud],
  );

  // -------------------------------------------------------------------------
  // Backtest
  // -------------------------------------------------------------------------

  const runBacktestNow = useCallback(async () => {
    const processed = processedRef.current;
    if (processed.length < 120) {
      notify('Historique trop court pour un backtest fiable', 'error');
      return;
    }

    setBacktest({ status: 'running', progress: 0, result: null });
    try {
      const result = await runBacktest(processed, windowLength, 50, (_stage, percent) =>
        setBacktest((previous) => ({ ...previous, progress: percent })),
      );
      if (!result) {
        notify('Backtest impossible : données insuffisantes', 'error');
        setBacktest({ status: 'idle', progress: 0, result: null });
        return;
      }
      setBacktest({ status: 'done', progress: 100, result });
      notify(`Backtest terminé sur ${result.testSize} tirages`, 'success');
    } catch (error) {
      notify(`Backtest interrompu : ${errorMessage(error)}`, 'error');
      setBacktest({ status: 'idle', progress: 0, result: null });
    }
  }, [notify, windowLength]);

  const copyGrid = useCallback(
    async (numbers: number[], chance: number) => {
      const text = `${numbers.join(' - ')} + chance ${chance}`;
      try {
        await navigator.clipboard.writeText(text);
        notify(`Grille copiée : ${text}`, 'success');
      } catch {
        notify('Copie impossible : sélectionnez les numéros à la main', 'error');
      }
    },
    [notify],
  );

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let disposed = false;

    async function boot() {
      const backendName = await initTensorFlow().catch(() => 'cpu');
      if (disposed) return;
      setBackend(backendName.toUpperCase());

      const [localDraws, savedHistory, lastGrids, modelExists, savedMeta] = await Promise.all([
        loadDraws(),
        loadPredictions(),
        loadLastPrediction(),
        hasSavedModel(),
        loadModelMeta(),
      ]);
      if (disposed) return;

      if (localDraws && localDraws.length > 0) applyDraws(localDraws);
      if (savedHistory) rememberHistory(savedHistory);
      setHasStoredModel(modelExists);

      if (modelExists) {
        const loaded = await loadModel();
        if (disposed) return;
        if (loaded) {
          const shape = loaded.inputs[0].shape;
          const features = Number(shape[2] ?? 0);
          const loadedWindow = Number(shape[1] ?? 12);
          const loadedMode: TrainingMode = loaded.name === 'loto-turbo' ? 'fast' : 'precise';
          const metaMatches = Boolean(
            savedMeta && savedMeta.mode === loadedMode && savedMeta.window === loadedWindow,
          );

          if (features === 25) {
            modelRef.current = loaded;
            // Keep the UI aligned with the architecture actually loaded, even
            // when the training metadata is missing or stale.
            setMode(loadedMode);
            setWindowLength(loadedWindow);
            const scalerSnapshot = savedMeta?.scaler;
            const scalerValid = Boolean(
              metaMatches &&
                scalerSnapshot &&
                scalerSnapshot.means.length === features &&
                scalerSnapshot.stds.length === features &&
                scalerSnapshot.means.every((value) => Number.isFinite(value)) &&
                scalerSnapshot.stds.every((value) => Number.isFinite(value) && value > 0),
            );

            if (scalerValid && scalerSnapshot) {
              const scaler = new StandardScaler();
              scaler.means = [...scalerSnapshot.means];
              scaler.stds = [...scalerSnapshot.stds];
              scalerRef.current = scaler;
            }

            if (metaMatches && savedMeta) {
              setFullTraining(savedMeta.fullTraining ?? true);
              setTraining(trainingFromSnapshot(savedMeta));
              setModel({
                params: savedMeta.params,
                window: savedMeta.window,
                mode: savedMeta.mode,
                trainedAt: savedMeta.trainedAt,
                bestValLoss: savedMeta.bestValLoss,
                bestValMae: savedMeta.bestValMae,
                bestEpoch: savedMeta.bestEpoch,
                epochsRun: savedMeta.epochsRun,
                totalEpochs: savedMeta.totalEpochs,
                stoppedEarly: savedMeta.stoppedEarly,
              });
            } else {
              setModel({
                params: countTrainableParams(loaded),
                window: loadedWindow,
                mode: loadedMode,
                trainedAt: null,
                bestValLoss: null,
                bestValMae: null,
                bestEpoch: null,
                epochsRun: 0,
                totalEpochs: TRAINING_CONFIG[loadedMode].epochs,
                stoppedEarly: false,
              });
            }

            if (!scalerValid) {
              notify('Modèle chargé sans normalisation : relancez un entraînement pour générer des grilles', 'info');
            }
          } else {
            loaded.dispose();
            setHasStoredModel(false);
          }
        } else {
          setHasStoredModel(false);
        }
      }

      if (lastGrids && lastGrids.length > 0 && profileRef.current) {
        const currentProfile = profileRef.current;
        setGrids(
          lastGrids.map((grid) => {
            const { score, analysis, reasons } = scoreGrid(grid, currentProfile);
            return { numbers: grid.slice(0, 5), chance: grid[5], score, analysis, reasons };
          }),
        );
      }

      setBooted(true);

      // Cloud: pull the shared history, keep the union with the local cache.
      try {
        setSyncLabel('Synchronisation cloud…');
        const [drawsResponse, predictionsResponse] = await Promise.all([
          fetch(`/api/sync?type=draws&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/sync?type=predictions&t=${Date.now()}`, { cache: 'no-store' }),
        ]);
        if (disposed) return;

        const drawsJson = (await drawsResponse.json()) as { success?: boolean; data?: LotoDraw[] };
        if (drawsJson.success && Array.isArray(drawsJson.data) && drawsJson.data.length > 0) {
          cloudCountRef.current = drawsJson.data.length;
          const merged = mergeDraws(rawRef.current, drawsJson.data);
          if (merged.length > rawRef.current.length) {
            applyDraws(merged);
            await saveDraws(merged);
          }
        }

        const predictionsJson = (await predictionsResponse.json()) as { success?: boolean; data?: SavedPrediction[] };
        if (predictionsJson.success && Array.isArray(predictionsJson.data) && predictionsJson.data.length > 0) {
          const known = new Set(historyRef.current.map((entry) => entry.timestamp));
          const merged = [
            ...historyRef.current,
            ...predictionsJson.data.filter((entry) => entry && !known.has(entry.timestamp)),
          ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, MAX_HISTORY);
          rememberHistory(merged);
          await savePredictions(merged);
        }

        setSyncLabel('Cloud synchronisé');
      } catch {
        setSyncLabel('Cache local');
      }

      await refreshDraws({ silent: true });
    }

    void boot();
    return () => {
      disposed = true;
    };
  }, [applyDraws, notify, rememberHistory, refreshDraws]);

  return {
    // data
    rawDraws,
    draws,
    profile,
    frequencies: profile?.frequency ?? null,
    latestDraw: draws.length > 0 ? draws[draws.length - 1] : null,
    booted,
    backend,
    syncLabel,
    refreshLabel,
    isRefreshing,
    pendingUpdates,
    // model
    mode,
    setMode,
    windowLength,
    setWindowLength,
    fullTraining,
    setFullTraining,
    training,
    model,
    hasStoredModel,
    cancelTraining,
    train,
    // inference
    grids,
    gridCount,
    setGridCount,
    isGenerating,
    generationProgress,
    generate,
    copyGrid,
    // journal
    history,
    // backtest
    backtest,
    runBacktest: runBacktestNow,
    // ui
    toast,
    notify,
    // actions
    refreshDraws,
  };
}
