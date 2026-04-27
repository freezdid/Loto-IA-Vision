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
      const textArray = $(element)
        .text()
        .split('\n')
        .map(p => p.trim())
        .filter(p => p !== '');

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
    if (scrapedResults.length > 0) {
      saveDrawsToDB(scrapedResults);
    }

    // Get full history from DB
    const results = getAllDrawsFromDB();

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

