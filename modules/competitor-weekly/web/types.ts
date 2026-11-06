// 页面读到的汇总（/api/site/competitor-weekly），与 backend/read.ts 的返回一致。
export interface DigestItem {
  id: string;
  title: string;
}

export interface CompetitorDigest {
  id: string;
  name: string;
  topic: string | null;
  itemCount: number;
  summary: string | null;
  highlights: Array<{ text: string; items: DigestItem[] }>;
  generatedAt: string;
}

export interface WeekDigests {
  week: string;
  first: string;
  last: string;
  competitors: CompetitorDigest[];
}

export interface CompetitorWeeklyResponse {
  weeks: string[];
  current: string;
  digests: WeekDigests | null;
}

/** "2026-W45" → "2026 年第 45 周"。 */
export function weekName(week: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  return m ? `${m[1]} 年第 ${Number(m[2])} 周` : week;
}

/** "2026-11-02" → "11月2日"。 */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日`;
}
