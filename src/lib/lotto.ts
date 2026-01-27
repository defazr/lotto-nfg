import fs from "fs";
import path from "path";

export type LottoDraw = {
  draw_no: number;
  draw_date?: string | null;
  date?: string | null;
  numbers: number[];
  bonus: number;
  total_sales?: number;
  first_prize_amount?: number;
  first_winners?: number;
};

export type LottoHistory = {
  meta: {
    updated_at_kst?: string;
    latest_draw: number;
    total_draws: number;
  };
  data: Record<string, LottoDraw> | LottoDraw[];
};

function readJson<T>(relativePath: string): T {
  const filePath = path.join(process.cwd(), "public", relativePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function getCache(): { latest_draw: LottoDraw } {
  return readJson<{ latest_draw: LottoDraw }>("data/lotto_cache.json");
}

export function getHistory(): LottoHistory {
  return readJson<LottoHistory>("data/lotto_history.json");
}

export function findDraw(history: LottoHistory, round: number): LottoDraw | null {
  const data = history.data;
  if (Array.isArray(data)) {
    return data.find((d) => String(d.draw_no) === String(round)) ?? null;
  }
  return (data[String(round)] || (data as Record<string, LottoDraw>)[round]) ?? null;
}

export function getAllRounds(history: LottoHistory): number[] {
  const data = history.data;
  if (Array.isArray(data)) return data.map((d) => d.draw_no).sort((a, b) => a - b);
  return Object.keys(data).map((k) => Number(k)).filter(Boolean).sort((a, b) => a - b);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  return dateString.replaceAll("-", ".");
}

export type NumberStat = {
  count: number;
  recent_draws: number[];
  first_seen: number;
  last_seen: number;
};

export type NumberIndex = {
  meta: {
    generated_at_kst: string;
    latest_draw: number;
    total_draws: number;
  };
  numbers: Record<string, NumberStat>;
};

export function getNumberIndex(): NumberIndex {
  return readJson<NumberIndex>("data/number_index.json");
}

export function getBallColor(n: number): string {
  if (n <= 10) return "#fbbf24";
  if (n <= 20) return "#60a5fa";
  if (n <= 30) return "#f87171";
  if (n <= 40) return "#9ca3af";
  return "#4ade80";
}

export function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

/**
 * Calculate zone distribution (1-10, 11-20, 21-30, 31-40, 41-45)
 */
export function getZoneDistribution(numbers: number[]): number[] {
  const zones = [0, 0, 0, 0, 0];
  for (const n of numbers) {
    if (n <= 10) zones[0]++;
    else if (n <= 20) zones[1]++;
    else if (n <= 30) zones[2]++;
    else if (n <= 40) zones[3]++;
    else zones[4]++;
  }
  return zones;
}

/**
 * Get gap (number of draws since last appearance) for each number
 */
export function getNumberGaps(history: LottoHistory): Map<number, number> {
  const draws: LottoDraw[] = Array.isArray(history.data)
    ? history.data
    : Object.values(history.data);
  const sortedDraws = [...draws].sort((a, b) => b.draw_no - a.draw_no);
  const latestDraw = sortedDraws[0]?.draw_no || 0;

  const lastSeen = new Map<number, number>();
  for (const d of sortedDraws) {
    for (const n of d.numbers) {
      if (!lastSeen.has(n)) {
        lastSeen.set(n, d.draw_no);
      }
    }
  }

  const gaps = new Map<number, number>();
  for (let i = 1; i <= 45; i++) {
    const seen = lastSeen.get(i);
    gaps.set(i, seen ? latestDraw - seen : latestDraw);
  }
  return gaps;
}

/**
 * Get numbers that haven't appeared in the last N draws
 */
export function getColdNumbers(history: LottoHistory, threshold: number = 20): number[] {
  const gaps = getNumberGaps(history);
  return Array.from(gaps.entries())
    .filter(([, gap]) => gap >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([n]) => n);
}

/**
 * Get numbers that appeared most frequently in last N draws
 */
export function getHotNumbers(history: LottoHistory, recentN: number = 20): { num: number; count: number }[] {
  const draws: LottoDraw[] = Array.isArray(history.data)
    ? history.data
    : Object.values(history.data);
  const sortedDraws = [...draws].sort((a, b) => b.draw_no - a.draw_no).slice(0, recentN);

  const freq = new Map<number, number>();
  for (const d of sortedDraws) {
    for (const n of d.numbers) {
      freq.set(n, (freq.get(n) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([num, count]) => ({ num, count }));
}

/**
 * Get co-occurrence pairs for a specific number
 */
export function getCoOccurrence(history: LottoHistory, targetNum: number): { num: number; count: number }[] {
  const draws: LottoDraw[] = Array.isArray(history.data)
    ? history.data
    : Object.values(history.data);

  const coCount = new Map<number, number>();
  for (const d of draws) {
    if (d.numbers.includes(targetNum)) {
      for (const n of d.numbers) {
        if (n !== targetNum) {
          coCount.set(n, (coCount.get(n) || 0) + 1);
        }
      }
    }
  }

  return Array.from(coCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([num, count]) => ({ num, count }));
}

/**
 * Get odd/even distribution
 */
export function getOddEvenRatio(numbers: number[]): { odd: number; even: number } {
  let odd = 0, even = 0;
  for (const n of numbers) {
    if (n % 2 === 0) even++;
    else odd++;
  }
  return { odd, even };
}

/**
 * Get sum of numbers
 */
export function getSum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}

/**
 * Get consecutive pairs count
 */
export function getConsecutiveCount(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) count++;
  }
  return count;
}

/**
 * Get recommended numbers based on various factors
 */
export function getRecommendedNumbers(history: LottoHistory): {
  hot: number[];
  cold: number[];
  balanced: number[]
} {
  const hot = getHotNumbers(history, 20).slice(0, 10).map(h => h.num);
  const cold = getColdNumbers(history, 15).slice(0, 10);

  // Balanced: mix of zones
  const numberIndex = getNumberIndex();
  const allStats = Object.entries(numberIndex.numbers)
    .map(([k, v]) => ({ num: Number(k), ...v }))
    .sort((a, b) => b.count - a.count);

  // Pick one from each zone based on frequency
  const balanced: number[] = [];
  for (let zone = 0; zone < 5; zone++) {
    const zoneStart = zone * 10 + 1;
    const zoneEnd = zone === 4 ? 45 : (zone + 1) * 10;
    const zoneNums = allStats.filter(s => s.num >= zoneStart && s.num <= zoneEnd);
    if (zoneNums[0]) balanced.push(zoneNums[0].num);
    if (zoneNums[1] && balanced.length < 6) balanced.push(zoneNums[1].num);
  }

  return { hot: hot.slice(0, 6), cold: cold.slice(0, 6), balanced: balanced.slice(0, 6) };
}
