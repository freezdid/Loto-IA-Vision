import Database from 'better-sqlite3';
import path from 'path';
import { LotoDraw } from './model';

const dbPath = path.resolve(process.cwd(), 'loto.db');
console.log("DB Path:", dbPath);
let db: any;

try {
  db = new Database(dbPath);
} catch (e) {
  console.error("Failed to initialize SQLite, falling back to mock storage:", e);
  // Mock db object to avoid crashes
  db = {
    exec: () => {},
    prepare: () => ({ 
      run: () => {}, 
      all: () => [], 
      get: () => null 
    }),
    transaction: (fn: any) => fn
  };
}


// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT,
    month_year TEXT,
    num0 INTEGER,
    num1 INTEGER,
    num2 INTEGER,
    num3 INTEGER,
    num4 INTEGER,
    chance INTEGER,
    UNIQUE(day, month_year, num0, num1, num2, num3, num4, chance)
  )
`);

export function saveDrawsToDB(draws: LotoDraw[]) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO draws (day, month_year, num0, num1, num2, num3, num4, chance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: LotoDraw[]) => {
    for (const item of items) {
      insert.run(item.day, item.month_year, item.num0, item.num1, item.num2, item.num3, item.num4, item.chance);
    }
  });


  insertMany(draws);
}

export function getAllDrawsFromDB(): LotoDraw[] {
  return db.prepare('SELECT * FROM draws ORDER BY id ASC').all() as LotoDraw[];
}

export function getLastDrawDate(): { day: string, month_year: string } | null {
  return db.prepare('SELECT day, month_year FROM draws ORDER BY id DESC LIMIT 1').get() as any || null;
}
