/**
 * French date helpers for the draw labels used by the source
 * ("Mercredi" + "14 octobre 2026").
 */

const FRENCH_MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

/** Lowercase + strip accents + collapse whitespace. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a draw label into an epoch timestamp, or null when the label is not
 * recognizable. Handles the current source format ("Mercredi" + "14 octobre
 * 2026") as well as legacy labels such as "Mercredi 24" + "Avril 2024".
 */
export function parseDrawDate(draw: { day: string; month_year: string }): number | null {
  const text = normalize(`${draw.day ?? ''} ${draw.month_year ?? ''}`);
  if (!text) return null;

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const year = Number.parseInt(yearMatch[0], 10);

  const month = FRENCH_MONTHS.findIndex((name) => text.includes(name));
  if (month < 0) return null;

  const withoutYear = text.replace(/\b(19|20)\d{2}\b/, ' ');
  const dayMatch = withoutYear.match(/\b(\d{1,2})\b/);
  const day = dayMatch ? Number.parseInt(dayMatch[1], 10) : 1;
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;

  // Draws happen at 20:20 local time; anchoring on UTC keeps ordering stable
  // whatever timezone the browser runs in.
  return Date.UTC(year, month, day, 20, 20);
}

/** Short human label for a timestamp, e.g. "mer. 14 oct.". */
export function formatDrawDate(timestamp: number, options?: Intl.DateTimeFormatOptions): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'date inconnue';
  return new Date(timestamp).toLocaleDateString(
    'fr-FR',
    options ?? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  );
}
