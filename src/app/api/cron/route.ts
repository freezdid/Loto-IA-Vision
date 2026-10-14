import { NextResponse } from 'next/server';
import { saveToBlob, loadFromBlob } from '@/lib/blob';
import { scrapeLatestDraws } from '@/lib/scraper';

export async function GET(req: Request) {
  try {
    console.log("Starting Loto Cron Job...");
    
    // 1. Scrape latest official draws
    const scrapedResults = await scrapeLatestDraws();
    if (!scrapedResults || scrapedResults.length === 0) {
      throw new Error("Scraping returned no results");
    }
    
    // 2. Load current Cloud Data from Vercel Blob
    const currentCloudData = await loadFromBlob('loto_history.json') || [];
    
    // 3. Update if new draws detected
    if (scrapedResults.length > currentCloudData.length) {
      console.log(`New draws detected (${scrapedResults.length} vs ${currentCloudData.length}). Updating cloud...`);
      await saveToBlob(scrapedResults, 'loto_history.json');
      return NextResponse.json({ 
        success: true, 
        message: "Cloud Vercel Blob updated with fresh draws", 
        count: scrapedResults.length 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Data already up to date", 
      count: currentCloudData.length 
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
