import { NextResponse } from 'next/server';
import { scrapeLatestDraws } from '@/lib/scraper';
import { getAllDraws, saveDraws } from '@/lib/db';
import { mergeDraws, sortDrawsByDate } from '@/lib/loto';
import { errorMessage } from '@/lib/errors';

/** Full history, newest draw first. */
export async function GET() {
  try {
    const scraped = await scrapeLatestDraws();
    await saveDraws(scraped);

    // The local database can hold draws older than the scraped page: keep both.
    const stored = await getAllDraws();
    const results = sortDrawsByDate(mergeDraws(scraped, stored), 'desc');

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error) {
    console.error('Scraping route error:', error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 502 });
  }
}
