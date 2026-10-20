import * as tf from '@tensorflow/tfjs';
import { StandardScaler } from './model';
import { MAIN_COUNT, MAX_CHANCE, MAX_MAIN, MIN_CHANCE, MIN_MAIN, clamp } from './loto';
import { GridAnalysis, StatsProfile, randomGrid, scoreGrid } from './stats';

export interface PredictionGrid {
  numbers: number[];
  chance: number;
  /** Statistical conformity score (1-99 percentile). */
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
const SIGMAS = [3, 7];

interface Priors {
  main: number[];
  chance: number[];
}

/**
 * Monte-Carlo decoding with model-guided sampling.
 *
 * The LSTM output is treated as a set of position estimates. For every row we
 * keep the direct rounded grid and draw two broader samples from a Gaussian
 * mixture around those positions, tempered by the real frequency of each
 * number. This produces valid, varied candidates instead of near-identical
 * rows that would need an arbitrary duplicate repair.
 *
 * The final set is selected for conformity *and* diversity: five grids that
 * all share the same numbers cover far less ground than five complementary
 * ones. The score stays a statistical percentile, never a win probability.
 */
export async function generatePredictions(options: GenerationOptions): Promise<PredictionGrid[]> {
  const { model, lastWindow, scaler, profile } = options;
  if (!lastWindow || lastWindow.length === 0 || lastWindow[0]?.length === 0) return [];

  const target = clamp(Math.round(options.count), 1, MAX_GRIDS);
  const perRound = Math.max(96, target * 12);
  const priors = buildPriors(profile);
  const rng = Math.random;
  const candidates = new Map<string, PredictionGrid>();

  const addCandidate = (grid: { numbers: number[]; chance: number }) => {
    const key = `${grid.numbers.join(',')}|${grid.chance}`;
    if (candidates.has(key)) return;
    const { score, analysis, reasons } = scoreGrid([...grid.numbers, grid.chance], profile);
    candidates.set(key, { ...grid, score, analysis, reasons });
  };

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
      if (!row || row.length < MAIN_COUNT + 1) continue;
      if (!row.slice(0, MAIN_COUNT + 1).every((value) => Number.isFinite(value))) continue;

      const direct = decodeRow(row, scaler);
      if (direct) addCandidate(direct);

      const real = scaler.inverseRow(row.slice(0, MAIN_COUNT + 1));
      for (const sigma of SIGMAS) {
        addCandidate(sampleFromModel(real, priors, rng, sigma * (1 + round * 0.15)));
      }
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

  return selectDiverse([...candidates.values()], target);
}

/** Blend the historical frequency of each number into a mild prior (~1 on average). */
function buildPriors(profile: StatsProfile): Priors {
  const counts = profile.frequency.counts;
  const chanceCounts = profile.frequency.chanceCounts;
  const mainTotal = Object.values(counts).reduce((total, value) => total + value, 0) || 1;
  const chanceTotal = Object.values(chanceCounts).reduce((total, value) => total + value, 0) || 1;
  const alpha = 2;

  const main = Array.from({ length: MAX_MAIN }, (_, index) => {
    const number = index + 1;
    return ((counts[number] ?? 0) + alpha) / (mainTotal + alpha * MAX_MAIN);
  });

  const chanceSize = MAX_CHANCE - MIN_CHANCE + 1;
  const chance = Array.from({ length: chanceSize }, (_, index) => {
    const number = index + MIN_CHANCE;
    return ((chanceCounts[number] ?? 0) + alpha) / (chanceTotal + alpha * chanceSize);
  });

  return { main, chance };
}

/** Draw a valid grid from a Gaussian mixture around the model's position estimates. */
function sampleFromModel(
  real: number[],
  priors: Priors,
  rng: () => number,
  sigma: number,
): { numbers: number[]; chance: number } {
  const positions = real.slice(0, MAIN_COUNT).map((value) => clamp(value, MIN_MAIN, MAX_MAIN));
  const weights = new Array<number>(MAX_MAIN).fill(0);

  for (let number = MIN_MAIN; number <= MAX_MAIN; number++) {
    let kernel = 0;
    for (const position of positions) {
      const distance = number - position;
      kernel += Math.exp(-0.5 * (distance / sigma) ** 2);
    }
    const prior = Math.pow(priors.main[number - MIN_MAIN] * MAX_MAIN, 0.35);
    weights[number - MIN_MAIN] = (kernel + 0.01) * prior;
  }

  const chanceValue = clamp(real[MAIN_COUNT], MIN_CHANCE, MAX_CHANCE);
  const chanceSize = MAX_CHANCE - MIN_CHANCE + 1;
  const chanceWeights = new Array<number>(chanceSize).fill(0);
  for (let number = MIN_CHANCE; number <= MAX_CHANCE; number++) {
    const kernel = Math.exp(-0.5 * ((number - chanceValue) / Math.max(1, sigma * 0.5)) ** 2);
    const prior = Math.pow(priors.chance[number - MIN_CHANCE] * chanceSize, 0.3);
    chanceWeights[number - MIN_CHANCE] = (kernel + 0.02) * prior;
  }

  return {
    numbers: sampleDistinct(weights, MAIN_COUNT, rng),
    chance: sampleWeighted(chanceWeights, rng) + MIN_CHANCE,
  };
}

/** Weighted sampling without replacement: five distinct main numbers. */
function sampleDistinct(weights: number[], count: number, rng: () => number): number[] {
  const pool = weights.slice();
  const picked: number[] = [];

  for (let index = 0; index < count; index++) {
    let total = 0;
    for (const weight of pool) total += weight;
    if (total <= 0) break;

    let target = rng() * total;
    let position = 0;
    while (position < pool.length - 1 && target > pool[position]) {
      target -= pool[position];
      position++;
    }
    picked.push(position + MIN_MAIN);
    pool[position] = 0;
  }

  while (picked.length < count) {
    const candidate = MIN_MAIN + Math.floor(rng() * (MAX_MAIN - MIN_MAIN + 1));
    if (!picked.includes(candidate)) picked.push(candidate);
  }

  return picked.sort((a, b) => a - b);
}

function sampleWeighted(weights: number[], rng: () => number): number {
  let total = 0;
  for (const weight of weights) total += weight;
  if (total <= 0) return Math.floor(rng() * weights.length);

  let target = rng() * total;
  let index = 0;
  while (index < weights.length - 1 && target > weights[index]) {
    target -= weights[index];
    index++;
  }
  return index;
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

/**
 * Pick the requested grids while keeping them complementary: a candidate that
 * shares numbers with an already selected grid pays a penalty, so the second
 * and third grids actually add coverage instead of echoing the first one.
 */
function selectDiverse(candidates: PredictionGrid[], target: number): PredictionGrid[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  if (sorted.length <= target || target === 1) return sorted.slice(0, Math.max(1, target));

  const selected: PredictionGrid[] = [sorted[0]];
  const remaining = sorted.slice(1);

  while (selected.length < target && remaining.length > 0) {
    let bestIndex = 0;
    let bestObjective = -Infinity;
    for (let index = 0; index < remaining.length; index++) {
      const overlap = maxOverlap(remaining[index], selected);
      const objective = remaining[index].score - overlap * 35;
      if (objective > bestObjective) {
        bestObjective = objective;
        bestIndex = index;
      }
    }
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected.sort((a, b) => b.score - a.score);
}

function maxOverlap(candidate: PredictionGrid, selected: PredictionGrid[]): number {
  let max = 0;
  for (const grid of selected) {
    const shared = candidate.numbers.filter((number) => grid.numbers.includes(number)).length;
    const chance = candidate.chance === grid.chance ? 0.25 : 0;
    max = Math.max(max, shared + chance);
  }
  return max;
}