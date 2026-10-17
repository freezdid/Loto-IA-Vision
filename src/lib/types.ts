/**
 * Core domain types shared by the whole application.
 * Raw draws are what we persist; processed draws are derived in memory.
 */

/** Raw draw as scraped from the source website (newest first). */
export interface LotoDraw {
  /** Weekday label, e.g. "Mercredi". */
  day: string;
  /** Day / month / year label, e.g. "14 octobre 2026". */
  month_year: string;
  num0: number;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  chance: number;
}

/** Draw enriched with the 25 engineered features consumed by the LSTM. */
export interface ProcessedDraw extends LotoDraw {
  /** Epoch milliseconds of the draw (0 when the date could not be parsed). */
  fullDate: number;
  freq_num0: number;
  freq_num1: number;
  freq_num2: number;
  freq_num3: number;
  freq_num4: number;
  freq_chance: number;
  sum_diff: number;
  pair_chance: number;
  impair_chance: number;
  pair: number;
  impair: number;
  is_under_24: number;
  is_under_40: number;
  last_seen_num0: number;
  last_seen_num1: number;
  last_seen_num2: number;
  last_seen_num3: number;
  last_seen_num4: number;
  last_seen_chance: number;
}

/** A saved set of predicted grids (local + cloud journal). */
export interface SavedPrediction {
  timestamp: string;
  grilles: number[][];
  /** Statistical conformity score (0-100) for each grid, when available. */
  scores?: number[];
}

/** Training profile selected by the user. */
export type TrainingMode = 'fast' | 'precise';
