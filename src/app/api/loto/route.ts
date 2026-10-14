import { NextResponse } from 'next/server';
import { scrapeLatestDraws } from '@/lib/scraper';
import { saveDrawsToDB, getAllDrawsFromDB } from '@/lib/db';

export async function GET() {
  try {
    const scrapedResults = await scrapeLatestDraws();

    // Save to SQLite if local environment allows
    try {
      if (scrapedResults.length > 0) {
        saveDrawsToDB(scrapedResults);
      }
    } catch (dbError) {
      console.warn("Database save notice (serverless mode):", dbError);
    }

    // Get full history from DB or fallback directly to scraped results
    let results: any[] = [];
    try {
      results = getAllDrawsFromDB();
      if (results.length === 0 && scrapedResults.length > 0) {
        results = scrapedResults;
      }
    } catch (dbError) {
      results = scrapedResults;
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Scraping route error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
