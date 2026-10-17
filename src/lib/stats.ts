import { MAIN_COUNT, MAX_CHANCE, MAX_MAIN, MIN_CHANCE, MIN_MAIN } from './loto';
import { ProcessedDraw } from './types';

/** Frequency table over the whole history. */
export interface FrequencyAnalysis {
  counts: Record<number, number>;
  chanceCounts: Record<number, number>;
  /** 12 most frequent main numbers. */
  hotNumbers: number[];
  /** 10 least frequent main numbers. */
  coldNumbers: number[];
  /** 3 most frequent chance numbers. */
  topChances: number[];
  maxCount: number;
}

export function calculateFrequencies(data: ProcessedDraw[]): FrequencyAnalysis {
  const counts: Record<number, number> = {};
  const chanceCounts: Record<number, number> = {};

  for (const draw of data) {
    for (const n of [draw.num0, draw.num1, draw.num2, draw.num3, draw.num4]) {
      counts[n] = (counts[n] ?? 0) + 1;
    }
    chanceCounts[draw.chance] = (chanceCounts[draw.chance] ?? 0) + 1;
  }

  const rankedNumbers = Object.entries(counts)
    .map(([value, count]) => ({ value: Number.parseInt(value, 10), count }))
    .sort((a, b) => b.count - a.count || a.value - b.value);

  const rankedChances = Object.entries(chanceCounts)
    .map(([value, count]) => ({ value: Number.parseInt(value, 10), count }))
    .sort((a, b) => b.count - a.count || a.value - b.value);

  return {
    counts,
    chanceCounts,
    hotNumbers: rankedNumbers.slice(0, 12).map((entry) => entry.value),
    coldNumbers: rankedNumbers.slice(-10).map((entry) => entry.value).sort((a, b) => a - b),
    topChances: rankedChances.slice(0, 3).map((entry) => entry.value),
    maxCount: rankedNumbers[0]?.count ?? 0,
  };
}

/** Reference distribution extracted from the real history. */
export interface StatsProfile {
  totalDraws: number;
  sumLow: number;
  sumHigh: number;
  sumMin: number;
  sumMax: number;
  sumMedian: number;
  parityBalancedRatio: number;
  frequency: FrequencyAnalysis;
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

/** Build the statistical reference used to score and filter predictions. */
export function buildStatsProfile(data: ProcessedDraw[]): StatsProfile {
  const sums = data
    .map((draw) => draw.num0 + draw.num1 + draw.num2 + draw.num3 + draw.num4)
    .sort((a, b) => a - b);

  const balanced = data.filter((draw) => draw.pair === 2 || draw.pair === 3).length;

  return {
    totalDraws: data.length,
    sumLow: percentile(sums, 0.15),
    sumHigh: percentile(sums, 0.85),
    sumMin: sums[0] ?? 0,
    sumMax: sums[sums.length - 1] ?? 0,
    sumMedian: percentile(sums, 0.5),
    parityBalancedRatio: data.length > 0 ? balanced / data.length : 0,
    frequency: calculateFrequencies(data),
  };
}

export interface GridAnalysis {
  sum: number;
  sumStatus: 'Optimal' | 'Atypique';
  evens: number;
  odds: number;
  balanceStatus: 'Équilibré' | 'Déséquilibré';
  low: number;
  high: number;
  spreadStatus: 'Répartie' | 'Concentrée';
  avgGap: number;
  hotMatches: number;
}

export interface GridScore {
  score: number;
  analysis: GridAnalysis;
  /** Human readable justifications, ordered by weight. */
  reasons: string[];
}

function clampMain(value: number): number {
  return Math.min(MAX_MAIN, Math.max(MIN_MAIN, value));
}

/** Describe a grid against the historical reference. */
export function analyzeGrid(numbers: number[], profile: StatsProfile): GridAnalysis {
  const main = numbers.slice(0, MAIN_COUNT).map(clampMain);
  const sum = main.reduce((total, n) => total + n, 0);
  const evens = main.filter((n) => n % 2 === 0).length;
  const odds = MAIN_COUNT - evens;
  const low = main.filter((n) => n <= 24).length;
  const high = MAIN_COUNT - low;

  const sorted = [...main].sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) gaps += sorted[i] - sorted[i - 1];
  const avgGap = gaps / Math.max(1, sorted.length - 1);

  const hotMatches = main.filter((n) => profile.frequency.hotNumbers.includes(n)).length;

  return {
    sum,
    sumStatus: sum >= profile.sumLow && sum <= profile.sumHigh ? 'Optimal' : 'Atypique',
    evens,
    odds,
    balanceStatus: evens === 2 || evens === 3 ? 'Équilibré' : 'Déséquilibré',
    low,
    high,
    spreadStatus: avgGap >= 4 && avgGap <= 12 ? 'Répartie' : 'Concentrée',
    avgGap,
    hotMatches,
  };
}

/**
 * Statistical conformity score (0-100). It does not claim to predict the draw:
 * it measures how close a grid sits to the patterns the real history produces
 * (sum band, parity, high/low split, spacing, frequent numbers).
 */
export function scoreGrid(numbers: number[], profile: StatsProfile): GridScore {
  const analysis = analyzeGrid(numbers, profile);
  const reasons: string[] = [];
  let score = 0;

  if (analysis.sum >= profile.sumLow && analysis.sum <= profile.sumHigh) {
    score += 30;
    reasons.push(`Somme ${analysis.sum} dans la zone la plus fréquente (${profile.sumLow}–${profile.sumHigh})`);
  } else if (analysis.sum >= profile.sumMin && analysis.sum <= profile.sumMax) {
    score += 12;
  }

  if (analysis.balanceStatus === 'Équilibré') {
    score += 20;
    reasons.push(`Parité équilibrée (${analysis.evens} pairs / ${analysis.odds} impairs)`);
  } else if (analysis.evens === 1 || analysis.evens === 4) {
    score += 6;
  }

  if (analysis.low === 2 || analysis.low === 3) {
    score += 20;
    reasons.push(`Répartition haute/basse équilibrée (${analysis.low} ≤ 24 / ${analysis.high} ≥ 25)`);
  } else if (analysis.low === 1 || analysis.low === 4) {
    score += 6;
  }

  if (analysis.avgGap >= 4 && analysis.avgGap <= 12) {
    score += 15;
    reasons.push(`Numéros bien espacés (écart moyen ${analysis.avgGap.toFixed(1)})`);
  } else if (analysis.avgGap >= 3 && analysis.avgGap <= 14) {
    score += 7;
  }

  if (analysis.hotMatches > 0) {
    const bonus = Math.min(15, analysis.hotMatches * 5);
    score += bonus;
    reasons.push(
      `${analysis.hotMatches} numéro${analysis.hotMatches > 1 ? 's' : ''} parmi les plus fréquents de l'historique`,
    );
  }

  return { score: Math.min(100, score), analysis, reasons: reasons.slice(0, 3) };
}

/** Quick-pick grid drawn uniformly, then reported with its conformity score. */
export function randomGrid(): number[] {
  const pool = Array.from({ length: MAX_MAIN - MIN_MAIN + 1 }, (_, i) => i + MIN_MAIN);
  const numbers: number[] = [];
  while (numbers.length < MAIN_COUNT) {
    const index = Math.floor(Math.random() * pool.length);
    numbers.push(pool.splice(index, 1)[0]);
  }
  numbers.sort((a, b) => a - b);
  const chance = Math.floor(Math.random() * (MAX_CHANCE - MIN_CHANCE + 1)) + MIN_CHANCE;
  return [...numbers, chance];
}
