import { LotoDraw } from './types';
import { parseDrawDate } from './dates';

/** Domain constants — kept free of TensorFlow so server routes stay light. */
export const MAIN_COUNT = 5;
export const NUM_LABELS = 6;
export const NUM_FEATURES = 25;
export const MIN_MAIN = 1;
export const MAX_MAIN = 49;
export const MIN_CHANCE = 1;
export const MAX_CHANCE = 10;

export const FEATURE_NAMES = [
  'num0', 'num1', 'num2', 'num3', 'num4', 'chance',
  'freq_num0', 'freq_num1', 'freq_num2', 'freq_num3', 'freq_num4', 'freq_chance',
  'sum_diff', 'pair_chance', 'impair_chance', 'pair', 'impair', 'is_under_24', 'is_under_40',
  'last_seen_num0', 'last_seen_num1', 'last_seen_num2', 'last_seen_num3', 'last_seen_num4', 'last_seen_chance',
] as const;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** True when a draw is well formed (5 unique numbers in 1-49 + chance in 1-10). */
export function isValidDraw(draw: LotoDraw): boolean {
  if (!draw) return false;
  const main = [draw.num0, draw.num1, draw.num2, draw.num3, draw.num4];
  if (main.some((n) => !Number.isInteger(n) || n < MIN_MAIN || n > MAX_MAIN)) return false;
  if (new Set(main).size !== MAIN_COUNT) return false;
  return Number.isInteger(draw.chance) && draw.chance >= MIN_CHANCE && draw.chance <= MAX_CHANCE;
}

/** Stable identity of a draw, used to dedupe history coming from several sources. */
export function drawKey(draw: LotoDraw): string {
  return [draw.day, draw.month_year, draw.num0, draw.num1, draw.num2, draw.num3, draw.num4, draw.chance].join('|');
}

/** Drop invalid draws and exact duplicates while preserving the input order. */
export function sanitizeDraws(draws: LotoDraw[]): LotoDraw[] {
  const seen = new Set<string>();
  const clean: LotoDraw[] = [];
  for (const draw of draws ?? []) {
    if (!isValidDraw(draw)) continue;
    const key = drawKey(draw);
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({
      day: String(draw.day ?? ''),
      month_year: String(draw.month_year ?? ''),
      num0: draw.num0,
      num1: draw.num1,
      num2: draw.num2,
      num3: draw.num3,
      num4: draw.num4,
      chance: draw.chance,
    });
  }
  return clean;
}

/**
 * Merge two histories (e.g. local IndexedDB and cloud), keeping the union of
 * their draws. The first list wins when both contain the same draw.
 */
export function mergeDraws(primary: LotoDraw[], secondary: LotoDraw[]): LotoDraw[] {
  return sanitizeDraws([...(primary ?? []), ...(secondary ?? [])]);
}

/**
 * Order draws by their real date. When dates are missing we fall back to the
 * scraped convention: the source lists the newest draw first.
 */
export function sortDrawsByDate(draws: LotoDraw[], direction: 'asc' | 'desc' = 'asc'): LotoDraw[] {
  const entries = draws.map((draw, index) => ({ draw, index, timestamp: parseDrawDate(draw) ?? 0 }));
  const allParsed = entries.length > 0 && entries.every((entry) => entry.timestamp > 0);
  if (!allParsed) return direction === 'asc' ? draws.slice().reverse() : draws.slice();

  return entries
    .sort((a, b) =>
      direction === 'asc'
        ? a.timestamp - b.timestamp || a.index - b.index
        : b.timestamp - a.timestamp || a.index - b.index,
    )
    .map((entry) => entry.draw);
}

export interface DatedDraw extends LotoDraw {
  fullDate: number;
}

/** Draws ordered chronologically and stamped with their real timestamp. */
export function withDates(draws: LotoDraw[]): DatedDraw[] {
  const chronological = sortDrawsByDate(sanitizeDraws(draws), 'asc');
  return chronological.map((draw) => ({ ...draw, fullDate: parseDrawDate(draw) ?? 0 }));
}
