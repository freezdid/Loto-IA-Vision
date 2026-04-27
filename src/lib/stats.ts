import { ProcessedDraw } from './model';

export function calculateFrequencies(data: ProcessedDraw[]) {
  const counts: Record<number, number> = {};
  const chanceCounts: Record<number, number> = {};

  data.forEach(draw => {
    [draw.num0, draw.num1, draw.num2, draw.num3, draw.num4].forEach(n => {
      counts[n] = (counts[n] || 0) + 1;
    });
    chanceCounts[draw.chance] = (chanceCounts[draw.chance] || 0) + 1;
  });

  return {
    topNums: Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([n]) => parseInt(n)),
    topChances: Object.entries(chanceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([n]) => parseInt(n))
  };
}

export function analyzeTypicality(numbers: number[]) {
  const sum = numbers.slice(0, 5).reduce((a, b) => a + b, 0);
  const evens = numbers.slice(0, 5).filter(n => n % 2 === 0).length;
  const odds = 5 - evens;
  
  // Typical Loto sum is between 100 and 200
  const sumStatus = sum >= 100 && sum <= 200 ? 'Optimal' : 'Atypique';
  // Typical balance is 2-3 or 3-2
  const balanceStatus = (evens === 2 || evens === 3) ? 'Équilibré' : 'Déséquilibré';

  return { sum, sumStatus, balanceStatus, evens, odds };
}
