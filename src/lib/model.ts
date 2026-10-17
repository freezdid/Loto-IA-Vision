import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { LotoDraw, ProcessedDraw, TrainingMode } from './types';
import { parseDrawDate } from './dates';
import {
  MAIN_COUNT,
  MAX_CHANCE,
  MAX_MAIN,
  MIN_CHANCE,
  MIN_MAIN,
  NUM_FEATURES,
  NUM_LABELS,
  sanitizeDraws,
  sortDrawsByDate,
} from './loto';

export {
  FEATURE_NAMES,
  MAIN_COUNT,
  MAX_CHANCE,
  MAX_MAIN,
  MIN_CHANCE,
  MIN_MAIN,
  NUM_FEATURES,
  NUM_LABELS,
  sanitizeDraws,
  sortDrawsByDate,
} from './loto';

const EVEN = new Set(Array.from({ length: 25 }, (_, i) => (i + 1) * 2));
const ODD = new Set(Array.from({ length: 25 }, (_, i) => i * 2 + 1));
const countEven = (nums: number[]) => nums.filter((n) => EVEN.has(n)).length;
const countOdd = (nums: number[]) => nums.filter((n) => ODD.has(n)).length;
const countUnder = (nums: number[], value: number) => nums.filter((n) => n <= value).length;

/**
 * Turn raw draws into an ordered, feature-rich series.
 *
 * Draws are sorted chronologically by their parsed date (falling back to the
 * scraped order when a date cannot be parsed). Every feature only depends on
 * draws up to its own index, so the series can be used for honest backtesting
 * without leaking the future.
 */
export function processData(draws: LotoDraw[]): ProcessedDraw[] {
  const ordered = sortDrawsByDate(sanitizeDraws(draws), 'asc');
  if (ordered.length === 0) return [];

  const freqMap = new Map<string, number>();
  const lastSeenMain = new Map<number, number>();
  const lastSeenChance = new Map<number, number>();

  const bumpFreq = (key: string, value: number) => {
    const composite = `${key}_${value}`;
    const next = (freqMap.get(composite) ?? 0) + 1;
    freqMap.set(composite, next);
    return next;
  };

  return ordered.map((draw, index) => {
    const nums = [draw.num0, draw.num1, draw.num2, draw.num3, draw.num4];

    const distanceToLastSeen = nums.map((n) => {
      const previous = lastSeenMain.get(n);
      const distance = previous === undefined ? index : index - previous;
      lastSeenMain.set(n, index);
      return distance;
    });

    const previousChance = lastSeenChance.get(draw.chance);
    const chanceDistance = previousChance === undefined ? index : index - previousChance;
    lastSeenChance.set(draw.chance, index);

    return {
      ...draw,
      fullDate: parseDrawDate(draw) ?? 0,
      freq_num0: bumpFreq('num0', draw.num0),
      freq_num1: bumpFreq('num1', draw.num1),
      freq_num2: bumpFreq('num2', draw.num2),
      freq_num3: bumpFreq('num3', draw.num3),
      freq_num4: bumpFreq('num4', draw.num4),
      freq_chance: bumpFreq('chance', draw.chance),
      sum_diff:
        (draw.num1 - draw.num0) ** 2 +
        (draw.num2 - draw.num1) ** 2 +
        (draw.num3 - draw.num2) ** 2 +
        (draw.num4 - draw.num3) ** 2,
      pair_chance: EVEN.has(draw.chance) ? 1 : 0,
      impair_chance: ODD.has(draw.chance) ? 1 : 0,
      pair: countEven(nums),
      impair: countOdd(nums),
      is_under_24: countUnder(nums, 24),
      is_under_40: countUnder(nums, 40),
      last_seen_num0: distanceToLastSeen[0],
      last_seen_num1: distanceToLastSeen[1],
      last_seen_num2: distanceToLastSeen[2],
      last_seen_num3: distanceToLastSeen[3],
      last_seen_num4: distanceToLastSeen[4],
      last_seen_chance: chanceDistance,
    };
  });
}

/** Project one processed draw onto the ordered feature vector. */
export function drawToFeatures(draw: ProcessedDraw): number[] {
  return [
    draw.num0, draw.num1, draw.num2, draw.num3, draw.num4, draw.chance,
    draw.freq_num0, draw.freq_num1, draw.freq_num2, draw.freq_num3, draw.freq_num4, draw.freq_chance,
    draw.sum_diff, draw.pair_chance, draw.impair_chance, draw.pair, draw.impair, draw.is_under_24, draw.is_under_40,
    draw.last_seen_num0, draw.last_seen_num1, draw.last_seen_num2, draw.last_seen_num3, draw.last_seen_num4, draw.last_seen_chance,
  ];
}

/** Z-score scaler fitted on the training rows only. */
export class StandardScaler {
  means: number[] = [];
  stds: number[] = [];

  fit(rows: number[][]): this {
    this.means = [];
    this.stds = [];
    if (rows.length === 0) return this;
    const columns = rows[0].length;
    for (let j = 0; j < columns; j++) {
      let sum = 0;
      for (let i = 0; i < rows.length; i++) sum += rows[i][j];
      const mean = sum / rows.length;
      let squared = 0;
      for (let i = 0; i < rows.length; i++) squared += (rows[i][j] - mean) ** 2;
      const std = Math.sqrt(squared / rows.length) || 1;
      this.means.push(mean);
      this.stds.push(std);
    }
    return this;
  }

  transform(rows: number[][]): number[][] {
    return rows.map((row) => row.map((value, j) => (value - this.means[j]) / this.stds[j]));
  }

  inverseRow(row: number[]): number[] {
    return row.map((value, j) => value * this.stds[j] + this.means[j]);
  }
}

export interface Dataset {
  X: number[][][];
  Y: number[][];
  scaler: StandardScaler;
  /** Last `windowLength` draws, scaled with the same scaler (inference input). */
  lastWindow: number[][];
}

/** Build sliding windows over a series of processed draws. */
export function createDataset(processed: ProcessedDraw[], windowLength: number): Dataset {
  const features = processed.map(drawToFeatures);
  const scaler = new StandardScaler().fit(features);
  return {
    ...buildScaledWindows(processed, windowLength, scaler),
    scaler,
    lastWindow: scaledLastWindow(processed, windowLength, scaler),
  };
}

/**
 * Last `windowLength` draws, scaled with the provided scaler.
 * Used for inference so the input normalization always matches the training one.
 */
export function scaledLastWindow(
  processed: ProcessedDraw[],
  windowLength: number,
  scaler: StandardScaler,
): number[][] {
  const scaled = scaler.transform(processed.map(drawToFeatures));
  return scaled.slice(Math.max(0, scaled.length - windowLength));
}

/** Same windows, but with a scaler fitted elsewhere (train/test separation). */
export function buildScaledWindows(
  processed: ProcessedDraw[],
  windowLength: number,
  scaler: StandardScaler,
): { X: number[][][]; Y: number[][] } {
  return buildWindows(scaler.transform(processed.map(drawToFeatures)), windowLength);
}

function buildWindows(scaled: number[][], windowLength: number) {
  const X: number[][][] = [];
  const Y: number[][] = [];
  for (let i = 0; i + windowLength < scaled.length; i++) {
    X.push(scaled.slice(i, i + windowLength));
    Y.push(scaled[i + windowLength].slice(0, NUM_LABELS));
  }
  return { X, Y };
}

// ---------------------------------------------------------------------------
// Architectures
// ---------------------------------------------------------------------------

export interface ArchitectureNode {
  id: string;
  label: string;
  value: string;
  detail: string;
}

/** Describe the architecture so the UI can never drift from the real model. */
export function getArchitectureSpec(mode: TrainingMode, windowLength: number): ArchitectureNode[] {
  if (mode === 'fast') {
    return [
      { id: 'input', label: 'Entrée', value: `${windowLength}×25`, detail: 'Tirages passés' },
      { id: 'lstm', label: 'LSTM', value: '64', detail: 'Mémoire' },
      { id: 'dropout', label: 'Dropout', value: '10%', detail: 'Régularisation' },
      { id: 'dense', label: 'Dense', value: '32', detail: 'ReLU' },
      { id: 'out', label: 'Sortie', value: '6', detail: '5 + Chance' },
    ];
  }
  return [
    { id: 'input', label: 'Entrée', value: `${windowLength}×25`, detail: 'Tirages passés' },
    { id: 'bilstm1', label: 'Bi-LSTM', value: '96', detail: 'Mémoire longue' },
    { id: 'dropout', label: 'Dropout', value: '20%', detail: 'Anti-surapprentissage' },
    { id: 'bilstm2', label: 'Bi-LSTM', value: '48', detail: 'Mémoire courte' },
    { id: 'attention', label: 'Attention', value: '×1', detail: 'Pondération temporelle' },
    { id: 'dense', label: 'Dense', value: '64', detail: 'Fusion' },
    { id: 'out', label: 'Sortie', value: '6', detail: '5 + Chance' },
  ];
}

/**
 * Temporal attention pooling: score every timestep, softmax the scores and
 * return the weighted average of the sequence. Keeps the useful steps and
 * fades the noise instead of trusting the last hidden state only.
 */
function attentionPooling(input: tf.SymbolicTensor, windowLength: number): tf.SymbolicTensor {
  const scores = tf.layers.dense({
    units: 1,
    activation: 'tanh',
    kernelInitializer: 'glorotNormal',
    name: 'attention_scores',
  }).apply(input) as tf.SymbolicTensor;

  const flat = tf.layers.flatten().apply(scores) as tf.SymbolicTensor;
  const weights = tf.layers.softmax({ name: 'attention_weights' }).apply(flat) as tf.SymbolicTensor;
  const shaped = tf.layers.reshape({ targetShape: [windowLength, 1] }).apply(weights) as tf.SymbolicTensor;
  const weighted = tf.layers.multiply().apply([input, shaped]) as tf.SymbolicTensor;
  return tf.layers.globalAveragePooling1d({ name: 'attention_pool' }).apply(weighted) as tf.SymbolicTensor;
}

/** Lightweight model: one LSTM + two dense layers. Fast enough for laptops. */
export function buildFastModel(windowLength: number, numFeatures: number, numLabels: number): tf.LayersModel {
  const model = tf.sequential({ name: 'loto-turbo' });
  model.add(tf.layers.lstm({
    units: 64,
    inputShape: [windowLength, numFeatures],
    returnSequences: false,
    dropout: 0.1,
    kernelInitializer: 'glorotNormal',
    recurrentInitializer: 'orthogonal',
  }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu', kernelInitializer: 'heNormal' }));
  model.add(tf.layers.dense({ units: numLabels, kernelInitializer: 'glorotNormal' }));
  return model;
}

/** Deep bi-directional model with attention pooling: slower, more expressive. */
export function buildAdvancedModel(windowLength: number, numFeatures: number, numLabels: number): tf.LayersModel {
  const input = tf.input({ shape: [windowLength, numFeatures], name: 'draw_sequence' });

  const memory = tf.layers.bidirectional({
    name: 'bilstm_memory',
    mergeMode: 'concat',
    layer: tf.layers.lstm({
      units: 96,
      returnSequences: true,
      kernelInitializer: 'glorotNormal',
      recurrentInitializer: 'orthogonal',
    }) as tf.RNN,
  }).apply(input) as tf.SymbolicTensor;

  const memoryDropout = tf.layers.dropout({ rate: 0.2 }).apply(memory) as tf.SymbolicTensor;

  const context = tf.layers.bidirectional({
    name: 'bilstm_context',
    mergeMode: 'concat',
    layer: tf.layers.lstm({
      units: 48,
      returnSequences: true,
      kernelInitializer: 'glorotNormal',
      recurrentInitializer: 'orthogonal',
    }) as tf.RNN,
  }).apply(memoryDropout) as tf.SymbolicTensor;

  const pooled = attentionPooling(context, windowLength);

  const dense = tf.layers.dense({
    units: 64,
    activation: 'relu',
    kernelInitializer: 'heNormal',
    kernelRegularizer: tf.regularizers.l2({ l2: 1e-4 }),
  }).apply(pooled) as tf.SymbolicTensor;

  const dropped = tf.layers.dropout({ rate: 0.1 }).apply(dense) as tf.SymbolicTensor;
  const output = tf.layers.dense({ units: numLabels, kernelInitializer: 'glorotNormal' }).apply(dropped) as tf.SymbolicTensor;

  return tf.model({ inputs: input, outputs: output, name: 'loto-elite' });
}

export function buildModel(mode: TrainingMode, windowLength: number, numFeatures = NUM_FEATURES, numLabels = NUM_LABELS) {
  return mode === 'fast'
    ? buildFastModel(windowLength, numFeatures, numLabels)
    : buildAdvancedModel(windowLength, numFeatures, numLabels);
}

export interface TrainingConfig {
  label: string;
  tagline: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
  minLearningRate: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  lrPlateauPatience: number;
  lrPlateauFactor: number;
  minDelta: number;
}

export const TRAINING_CONFIG: Record<TrainingMode, TrainingConfig> = {
  fast: {
    label: 'Turbo',
    tagline: 'Quelques secondes, idéal au quotidien',
    epochs: 24,
    batchSize: 96,
    learningRate: 1.5e-3,
    minLearningRate: 2e-4,
    validationSplit: 0.1,
    earlyStoppingPatience: 6,
    lrPlateauPatience: 2,
    lrPlateauFactor: 0.5,
    minDelta: 1e-4,
  },
  precise: {
    label: 'Elite',
    tagline: 'Analyse approfondie, meilleure stabilité',
    epochs: 60,
    batchSize: 64,
    learningRate: 1e-3,
    minLearningRate: 1e-4,
    validationSplit: 0.1,
    earlyStoppingPatience: 10,
    lrPlateauPatience: 3,
    lrPlateauFactor: 0.5,
    minDelta: 5e-5,
  },
};

function compileModel(model: tf.LayersModel, mode: TrainingMode) {
  const config = TRAINING_CONFIG[mode];
  model.compile({
    // Huber behaves like MAE for small errors and like MSE for outliers:
    // robust against the occasional atypical draw.
    loss: tf.losses.huberLoss,
    optimizer: tf.train.adam(config.learningRate),
    metrics: ['mae'],
  });
}

/** (Re)compile a freshly built or freshly loaded model before fitting. */
export function prepareForTraining(model: tf.LayersModel, mode: TrainingMode) {
  compileModel(model, mode);
}

export function countTrainableParams(model: tf.LayersModel): number {
  return model.countParams();
}

function setLearningRate(model: tf.LayersModel, value: number) {
  const optimizer = model.optimizer as unknown as { learningRate?: number } | null;
  if (optimizer && typeof optimizer.learningRate === 'number') optimizer.learningRate = value;
}

export interface EpochMetrics {
  epoch: number;
  totalEpochs: number;
  loss: number;
  valLoss: number | null;
  bestValLoss: number | null;
  learningRate: number;
  durationMs: number;
}

export interface TrainHooks {
  onEpochEnd?: (metrics: EpochMetrics) => void | Promise<void>;
  shouldCancel?: () => boolean;
}

export interface TrainSummary {
  epochsRun: number;
  epochsRequested: number;
  stoppedEarly: boolean;
  bestValLoss: number | null;
  finalLoss: number | null;
  durationMs: number;
  history: EpochMetrics[];
}

/**
 * Fit a compiled model with validation split, early stopping, restore-best
 * weights and a plateau learning-rate decay. Yields to the browser between
 * epochs so the UI keeps painting during training.
 *
 * Early stopping is implemented here instead of via
 * `tf.callbacks.earlyStopping({ restoreBestWeights: true })`: TensorFlow.js 4.x
 * throws `restoreBestWeights = True is not implemented in EarlyStopping yet.`
 * as soon as `fit` starts, which used to abort every training run.
 */
export async function trainModel(
  model: tf.LayersModel,
  X: number[][][],
  Y: number[][],
  mode: TrainingMode,
  hooks: TrainHooks = {},
): Promise<TrainSummary> {
  const config = TRAINING_CONFIG[mode];
  const xs = tf.tensor3d(X);
  const ys = tf.tensor2d(Y);
  const history: EpochMetrics[] = [];
  const start = performance.now();
  let epochStart = start;
  let epochsRun = 0;
  let bestValLoss: number | null = null;
  let bestWeights: tf.Tensor[] | null = null;
  let earlyWait = config.earlyStoppingPatience;
  let plateauWait = config.lrPlateauPatience;
  let learningRate = config.learningRate;
  let stoppedEarly = false;

  const uiCallback = new tf.CustomCallback({
    onEpochBegin: async () => {
      epochStart = performance.now();
    },
    onEpochEnd: async (epoch, logs) => {
      epochsRun = epoch + 1;
      const loss = typeof logs?.loss === 'number' ? logs.loss : Number.NaN;
      const valLoss = typeof logs?.val_loss === 'number' ? logs.val_loss : null;

      if (valLoss !== null) {
        if (bestValLoss === null || valLoss < bestValLoss - config.minDelta) {
          bestValLoss = valLoss;
          // Snapshot the new best checkpoint (one snapshot kept at a time).
          for (const tensor of bestWeights ?? []) tensor.dispose();
          bestWeights = model.getWeights().map((weight) => weight.clone());
          earlyWait = config.earlyStoppingPatience;
          plateauWait = config.lrPlateauPatience;
        } else {
          earlyWait -= 1;
          plateauWait -= 1;
          if (plateauWait <= 0) {
            learningRate = Math.max(learningRate * config.lrPlateauFactor, config.minLearningRate);
            setLearningRate(model, learningRate);
            plateauWait = config.lrPlateauPatience;
          }
          if (earlyWait <= 0) {
            stoppedEarly = true;
            model.stopTraining = true;
          }
        }
      }

      const metrics: EpochMetrics = {
        epoch: epochsRun,
        totalEpochs: config.epochs,
        loss,
        valLoss,
        bestValLoss,
        learningRate,
        durationMs: performance.now() - epochStart,
      };
      history.push(metrics);
      await hooks.onEpochEnd?.(metrics);

      if (hooks.shouldCancel?.()) model.stopTraining = true;
      await tf.nextFrame();
    },
  });

  try {
    await model.fit(xs, ys, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      shuffle: true,
      validationSplit: config.validationSplit,
      callbacks: [uiCallback],
      verbose: 0,
    });

    // Put the best checkpoint back: the saved model is the one that scored
    // `bestValLoss`, not the last (possibly overfitted) set of weights.
    if (bestWeights) model.setWeights(bestWeights);
  } finally {
    const checkpoints = bestWeights as tf.Tensor[] | null;
    for (const tensor of checkpoints ?? []) tensor.dispose();
    xs.dispose();
    ys.dispose();
  }

  return {
    epochsRun,
    epochsRequested: config.epochs,
    stoppedEarly: stoppedEarly || epochsRun < config.epochs,
    bestValLoss,
    finalLoss: history.length > 0 ? history[history.length - 1].loss : null,
    durationMs: performance.now() - start,
    history,
  };
}

// ---------------------------------------------------------------------------
// Backtesting
// ---------------------------------------------------------------------------

export interface BacktestResult {
  testSize: number;
  avgMatches: number;
  winRate: number;
  chanceRate: number;
  bestMatches: number;
  distribution: Record<number, number>;
}

/**
 * Train on the past, then replay the model over the last `testSize` real draws.
 * The scaler is fitted on the training slice only, so the evaluation stays
 * honest: nothing from the test window (not even its mean/variance) leaks in.
 */
export async function runBacktest(
  processed: ProcessedDraw[],
  windowLength: number,
  testSize = 50,
  onProgress?: (stage: 'training' | 'predicting', percent: number) => void,
): Promise<BacktestResult | null> {
  if (processed.length <= testSize + windowLength + 20) return null;

  const splitIndex = processed.length - testSize;
  const trainData = processed.slice(0, splitIndex);
  const evalData = processed.slice(splitIndex - windowLength);

  const { X, Y, scaler } = createDataset(trainData, windowLength);
  const { X: XTest, Y: YTest } = buildScaledWindows(evalData, windowLength, scaler);
  if (X.length === 0 || XTest.length === 0) return null;

  const model = buildAdvancedModel(windowLength, NUM_FEATURES, NUM_LABELS);
  prepareForTraining(model, 'precise');
  const config = TRAINING_CONFIG.precise;

  const xs = tf.tensor3d(X);
  const ys = tf.tensor2d(Y);
  const xTest = tf.tensor3d(XTest);
  try {
    await model.fit(xs, ys, {
      epochs: Math.min(config.epochs, 30),
      batchSize: config.batchSize,
      shuffle: true,
      validationSplit: config.validationSplit,
      verbose: 0,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          onProgress?.('training', Math.round(((epoch + 1) / Math.min(config.epochs, 30)) * 70));
          void logs;
          await tf.nextFrame();
        },
      },
    });

    const predicted = model.predict(xTest) as tf.Tensor;
    const rows = (await predicted.array()) as number[][];
    onProgress?.('predicting', 100);

    let totalMatches = 0;
    let chanceHits = 0;
    let wins = 0;
    let bestMatches = 0;
    const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < rows.length; i++) {
      const prediction = scaler.inverseRow(rows[i]).map((value, j) => {
        const rounded = Math.round(value);
        return j < MAIN_COUNT
          ? Math.min(MAX_MAIN, Math.max(MIN_MAIN, rounded))
          : Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, rounded));
      });
      const actual = scaler.inverseRow(YTest[i]).map((value) => Math.round(value));

      // Distinct hits only: a duplicated prediction must not count twice.
      const predictedMain = [...new Set(prediction.slice(0, MAIN_COUNT))];
      const matched = predictedMain.filter((n) => actual.slice(0, MAIN_COUNT).includes(n)).length;
      const chanceHit = prediction[MAIN_COUNT] === actual[MAIN_COUNT];

      totalMatches += matched;
      if (chanceHit) chanceHits++;
      if (matched >= 2 || chanceHit) wins++;
      if (matched > bestMatches) bestMatches = matched;
      distribution[matched] = (distribution[matched] ?? 0) + 1;
    }

    const total = rows.length;
    return {
      testSize: total,
      avgMatches: totalMatches / total,
      winRate: (wins / total) * 100,
      chanceRate: (chanceHits / total) * 100,
      bestMatches,
      distribution,
    };
  } finally {
    xs.dispose();
    ys.dispose();
    xTest.dispose();
    model.dispose();
  }
}

// ---------------------------------------------------------------------------
// Runtime setup
// ---------------------------------------------------------------------------

/** Pick the fastest available backend and report its name. */
export async function initTensorFlow(): Promise<string> {
  await tf.ready();
  const webgpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;

  if (webgpuSupported && tf.findBackend('webgpu')) {
    try {
      await tf.setBackend('webgpu');
      await tf.ready();
    } catch {
      // Fall through to WebGL below.
    }
  }

  if (tf.getBackend() !== 'webgpu' && tf.findBackend('webgl')) {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
    } catch {
      // Keep whatever backend works (CPU in the worst case).
    }
  }

  return tf.getBackend();
}
