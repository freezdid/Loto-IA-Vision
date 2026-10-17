import * as cheerio from 'cheerio';
import { LotoDraw } from './types';
import { isValidDraw, sanitizeDraws } from './loto';

const SOURCE_URL = 'http://loto.akroweb.fr/loto-historique-tirages/';
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { fetchedAt: number; draws: LotoDraw[] } | null = null;

/**
 * Scrape the full draw history (newest draw first). Results are cached in memory
 * for a few minutes so a page load does not hammer the source website.
 */
export async function scrapeLatestDraws(options: { force?: boolean } = {}): Promise<LotoDraw[]> {
  if (!options.force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.draws;
  }

  const response = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Le site source a répondu ${response.status}`);
  }

  const draws = parseHistoryTable(await response.text());
  cache = { fetchedAt: Date.now(), draws };
  return draws;
}

/**
 * The history table holds one draw per row as
 * [weekday, "14 octobre 2026", num0..num4, chance].
 * Columns are located by content instead of fixed indexes so a layout tweak on
 * the source website cannot silently corrupt the dataset.
 */
export function parseHistoryTable(html: string): LotoDraw[] {
  const $ = cheerio.load(html);
  const parsed: LotoDraw[] = [];

  $('table').first().find('tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((_, cell) => $(cell).text().trim())
      .get()
      .filter((value) => value !== '');

    if (cells.length < 8) return;

    const dateIndex = cells.findIndex((value) => /\b(19|20)\d{2}\b/.test(value));
    if (dateIndex < 1) return;

    const numbers = cells
      .slice(dateIndex + 1)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value));

    if (numbers.length < 6) return;

    const draw: LotoDraw = {
      day: cells[dateIndex - 1],
      month_year: cells[dateIndex],
      num0: numbers[0],
      num1: numbers[1],
      num2: numbers[2],
      num3: numbers[3],
      num4: numbers[4],
      chance: numbers[5],
    };

    if (!isValidDraw(draw)) {
      console.warn('Tirage ignoré (format inattendu) :', JSON.stringify(draw));
      return;
    }
    parsed.push(draw);
  });

  if (parsed.length === 0) {
    throw new Error('Aucun tirage exploitable dans la page source');
  }

  return sanitizeDraws(parsed);
}

export function clearScrapeCache() {
  cache = null;
}
