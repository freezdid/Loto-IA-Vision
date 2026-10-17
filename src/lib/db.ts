import path from 'path';
import { LotoDraw } from './types';
import { drawKey, sortDrawsByDate } from './loto';
import { errorMessage } from './errors';

/**
 * Local SQLite storage. On serverless platforms (Vercel) the native module and
 * the write access are usually unavailable, so every write is mirrored in an
 * in-memory store and the module degrades gracefully instead of crashing.
 */

interface SqliteStatement {
  run: (...params: unknown[]) => unknown;
  all: () => unknown[];
}

interface SqliteLike {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => SqliteStatement;
  transaction: (fn: (draws: LotoDraw[]) => void) => (draws: LotoDraw[]) => void;
}

const memoryStore = new Map<string, LotoDraw>();
let database: SqliteLike | null = null;
let initialized = false;

async function getDatabase(): Promise<SqliteLike | null> {
  if (initialized) return database;
  initialized = true;

  try {
    const { default: BetterSqlite3 } = await import('better-sqlite3');
    const instance = new BetterSqlite3(path.resolve(process.cwd(), 'loto.db')) as unknown as SqliteLike;
    instance.exec(`
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
    database = instance;
  } catch (error) {
    console.warn('SQLite indisponible, historique gardé en mémoire :', errorMessage(error));
    database = null;
  }

  return database;
}

/** Persist draws (idempotent) in SQLite and in the in-memory mirror. */
export async function saveDraws(draws: LotoDraw[]): Promise<void> {
  for (const draw of draws) memoryStore.set(drawKey(draw), draw);

  const db = await getDatabase();
  if (!db) return;

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO draws (day, month_year, num0, num1, num2, num3, num4, chance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items: LotoDraw[]) => {
      for (const draw of items) {
        insert.run(draw.day, draw.month_year, draw.num0, draw.num1, draw.num2, draw.num3, draw.num4, draw.chance);
      }
    });
    insertMany(draws);
  } catch (error) {
    console.warn('Écriture SQLite impossible :', errorMessage(error));
  }
}

/** Full history, newest draw first (the convention used by the whole app). */
export async function getAllDraws(): Promise<LotoDraw[]> {
  const db = await getDatabase();
  if (db) {
    try {
      const rows = db
        .prepare('SELECT day, month_year, num0, num1, num2, num3, num4, chance FROM draws ORDER BY id ASC')
        .all() as LotoDraw[];
      if (rows.length > 0) return sortDrawsByDate(rows, 'desc');
    } catch (error) {
      console.warn('Lecture SQLite impossible :', errorMessage(error));
    }
  }
  return sortDrawsByDate([...memoryStore.values()], 'desc');
}
