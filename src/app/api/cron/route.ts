import { NextResponse } from 'next/server';
import { loadFromBlob, saveToBlob } from '@/lib/blob';
import { scrapeLatestDraws } from '@/lib/scraper';
import { sanitizeDraws, sortDrawsByDate } from '@/lib/loto';
import { errorMessage } from '@/lib/errors';
import { LotoDraw } from '@/lib/types';

const HISTORY_PATH = 'loto_history.json';

/**
 * Vercel Cron (Mon/Wed/Sat evening): refresh the cloud history from the source
 * website. Runs with `force` so a warm instance never serves a stale scrape.
 */
export async function GET() {
  try {
    const scraped = await scrapeLatestDraws({ force: true });
    const cloud = sanitizeDraws((await loadFromBlob<LotoDraw[]>(HISTORY_PATH)) ?? []);

    if (scraped.length <= cloud.length) {
      return NextResponse.json({ success: true, message: 'Historique déjà à jour', count: cloud.length });
    }

    const merged = sortDrawsByDate(sanitizeDraws([...scraped, ...cloud]), 'desc');
    const url = await saveToBlob(merged, HISTORY_PATH);
    if (!url) {
      return NextResponse.json({ success: false, error: 'Blob inaccessible' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: 'Historique cloud actualisé',
      added: scraped.length - cloud.length,
      count: merged.length,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
