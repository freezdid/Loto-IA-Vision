import * as tf from '@tensorflow/tfjs';
import { StandardScaler } from './model';
import { MAIN_COUNT, MAX_CHANCE, MAX_MAIN, MIN_CHANCE, MIN_MAIN, clamp } from './loto';
import { GridAnalysis, StatsProfile, randomGrid, scoreGrid } from './stats';

export interface PredictionGrid {
  numbers: number[];
  chance: number;
  /** Statistical conformity score (0-100). */
  score: number;
  analysis: GridAnalysis;
  reasons: string[];
}

export interface GenerationOptions {
  model: tf.LayersModel;
  /** Scaled window of the most recent draws (inference input). */
  lastWindow: number[][];
  scaler: StandardScaler;
  profile: StatsProfile;
  count: number;
  onProgress?: (percent: number) => void;
  shouldCancel?: () => boolean;
}

const ROUNDS = 4;
const MAX_GRIDS = 10;

/**
 * Monte-Carlo style decoding: the model is asked for many candidate grids with
 * a growing amount of controlled noise, then the candidates are ranked by their
 * statistical conformity with the real history. Ensemble scoring keeps the
 * output stable instead of trusting a single noisy prediction.
 */
export async function generatePredictions(options: GenerationOptions): Promise<PredictionGrid[]> {
  const { model, lastWindow, scaler, profile } = options;
  if (!lastWindow || lastWindow.length === 0 || lastWindow[0]?.length === 0) return [];

  const target = clamp(Math.round(options.count), 1, MAX_GRIDS);
  const perRound = Math.max(96, target * 12);
  const candidates = new Map<string, PredictionGrid>();

  for (let round = 0; round < ROUNDS; round++) {
    if (options.shouldCancel?.()) break;

    const exploration = 0.012 + (round / Math.max(1, ROUNDS - 1)) * 0.022;
    const batch = Array.from({ length: perRound }, () =>
      lastWindow.map((row) => row.map((value) => value + (Math.random() * 2 - 1) * exploration)),
    );

    const rows = tf.tidy(() => {
      const input = tf.tensor3d(batch);
      const output = model.predict(input) as tf.Tensor;
      return output.arraySync() as number[][];
    });

    for (const row of rows) {
      const grid = decodeRow(row, scaler);
      if (!grid) continue;
      const key = `${grid.numbers.join(',')}|${grid.chance}`;
      if (candidates.has(key)) continue;
      const { score, analysis, reasons } = scoreGrid([...grid.numbers, grid.chance], profile);
      candidates.set(key, { ...grid, score, analysis, reasons });
    }

    options.onProgress?.(Math.round(((round + 1) / ROUNDS) * 100));
    await tf.nextFrame();
  }

  // The model can collapse towards the same few grids; complete with quick picks
  // so the requested amount is always delivered.
  let guard = 0;
  while (candidates.size < target && guard < target * 40) {
    guard++;
    const grid = randomGrid();
    const key = `${grid.slice(0, MAIN_COUNT).join(',')}|${grid[MAIN_COUNT]}`;
    if (candidates.has(key)) continue;
    const { score, analysis, reasons } = scoreGrid(grid, profile);
    candidates.set(key, {
      numbers: grid.slice(0, MAIN_COUNT),
      chance: grid[MAIN_COUNT],
      score,
      analysis,
      reasons,
    });
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, target);
}

/** Scale back a model row and repair it into a valid, unique 5 + chance grid. */
function decodeRow(row: number[], scaler: StandardScaler): { numbers: number[]; chance: number } | null {
  if (!row || row.length < MAIN_COUNT + 1) return null;
  const real = scaler.inverseRow(row.slice(0, MAIN_COUNT + 1));
  const numbers = repairMainNumbers(real.slice(0, MAIN_COUNT).map((value) => Math.round(value)));
  const chance = clamp(Math.round(real[MAIN_COUNT]), MIN_CHANCE, MAX_CHANCE);
  return { numbers, chance };
}

/** Force five distinct numbers in range, moving collisions to the nearest free slot. */
function repairMainNumbers(values: number[]): number[] {
  const used = new Set<number>();
  const result: number[] = [];

  for (const raw of values) {
    let value = clamp(Math.round(raw), MIN_MAIN, MAX_MAIN);
    if (used.has(value)) {
      let replacement: number | null = null;
      for (let offset = 1; offset <= MAX_MAIN; offset++) {
        const up = value + offset;
        const down = value - offset;
        if (up <= MAX_MAIN && !used.has(up)) { replacement = up; break; }
        if (down >= MIN_MAIN && !used.has(down)) { replacement = down; break; }
      }
      value = replacement ?? value;
    }
    used.add(value);
    result.push(value);
  }

  return result.sort((a, b) => a - b);
}
