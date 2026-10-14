import * as cheerio from 'cheerio';
import { LotoDraw } from './model';

export async function scrapeLatestDraws(): Promise<LotoDraw[]> {
  const res = await fetch("http://loto.akroweb.fr/loto-historique-tirages/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Erreur HTTP scrape: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const scrapedResults: LotoDraw[] = [];

  $('table').first().find('tr').each((_, element) => {
    const tds = $(element).find('td');
    const textArray = tds.map((_, td) => $(td).text().trim()).get().filter(p => p !== '');

    if (textArray.length >= 8) {
      const num0 = parseInt(textArray[2], 10);
      const num1 = parseInt(textArray[3], 10);
      const num2 = parseInt(textArray[4], 10);
      const num3 = parseInt(textArray[5], 10);
      const num4 = parseInt(textArray[6], 10);
      const chance = parseInt(textArray[7], 10);

      if (!isNaN(num0) && !isNaN(num1) && !isNaN(num2) && !isNaN(num3) && !isNaN(num4) && !isNaN(chance)) {
        scrapedResults.push({
          day: textArray[0],
          month_year: textArray[1],
          num0,
          num1,
          num2,
          num3,
          num4,
          chance,
        });
      }
    }
  });

  return scrapedResults;
}
