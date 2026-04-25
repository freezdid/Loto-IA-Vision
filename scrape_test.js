const cheerio = require('cheerio');

async function scrape() {
  const res = await fetch("http://loto.akroweb.fr/loto-historique-tirages/");
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const trs = $('table').first().find('tr').slice(0, 3);
  trs.each((i, el) => {
    console.log(`--- TR ${i} ---`);
    console.log($(el).text().split('\n').map(x => x.trim()).filter(x => x !== ''));
  });
}

scrape();
