import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { saveDrawsToDB, getAllDrawsFromDB } from '@/lib/db';

export async function GET() {
  try {
    const res = await fetch("http://loto.akroweb.fr/loto-historique-tirages/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const scrapedResults: any[] = [];

    $('table').first().find('tr').each((index, element) => {
      const tds = $(element).find('td');
      const textArray = tds.map((i, td) => $(td).text().trim()).get().filter(p => p !== '');

      if (textArray.length >= 8) {
        scrapedResults.push({
          day: textArray[0],
          month_year: textArray[1],
          num0: parseInt(textArray[2], 10),
          num1: parseInt(textArray[3], 10),
          num2: parseInt(textArray[4], 10),
          num3: parseInt(textArray[5], 10),
          num4: parseInt(textArray[6], 10),
          chance: parseInt(textArray[7], 10),
        });
      }
    });


    // Save to SQLite
    try {
      if (scrapedResults.length > 0) {
        saveDrawsToDB(scrapedResults);
      }
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Continue even if DB fails, to at least return scraped data
    }

    // Get full history from DB
    let results = [];
    try {
      results = getAllDrawsFromDB();
      if (results.length === 0 && scrapedResults.length > 0) {
        results = scrapedResults;
      }
    } catch (dbError) {
      console.error("Database read error:", dbError);
      results = scrapedResults;
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("Scraping route crash:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}


