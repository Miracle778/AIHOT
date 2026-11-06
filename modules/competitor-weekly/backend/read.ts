// 读汇总给页面和主题页：引用的条目按现在的公开状态读，撤下的不再出现。
import { sql } from "@aihot/backend/db";
import { TOPICS } from "@aihot/backend/publication/topics";
import { listedCondition } from "@aihot/backend/publication/scope";
import { COMPETITORS, competitorName, weekWindow } from "./compose.ts";

export interface DigestItem {
  id: string;
  title: string;
}

export interface CompetitorDigest {
  id: string;
  name: string;
  /** 它的主题页（topics.json 里 entityId 是它的那个）。 */
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

const topicOf = (id: string) => TOPICS.find((t) => t.entityId === id)?.slug ?? null;

/** 写过汇总的周，新的在前。 */
export async function digestWeeks(): Promise<string[]> {
  return (await sql<{ week: string }[]>`SELECT DISTINCT week FROM competitor_weekly ORDER BY week DESC LIMIT 104`).map((r) => r.week);
}

async function currentTitles(ids: string[], now: Date): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await sql<{ id: string; title: string }[]>`
    SELECT p.article_id AS id, p.title FROM publications p WHERE p.article_id = ANY(${ids}::text[]) AND ${listedCondition(now)}`;
  return new Map(rows.map((r) => [r.id, r.title]));
}

/** 一周的汇总，竞品按 COMPETITORS 的顺序；有变化的在前，没有动态的在后。 */
export async function weekDigests(week: string, now = new Date()): Promise<WeekDigests | null> {
  const rows = await sql<{ entity_id: string; summary: string | null; highlights: Array<{ text: string; items: string[] }>; item_count: number; generated_at: Date }[]>`
    SELECT entity_id, summary, highlights, item_count, generated_at FROM competitor_weekly WHERE week = ${week}`;
  if (!rows.length) return null;
  const titles = await currentTitles(rows.flatMap((r) => r.highlights.flatMap((h) => h.items)), now);
  const byId = new Map(rows.map((r) => [r.entity_id, r]));
  const competitors: CompetitorDigest[] = [];
  for (const id of COMPETITORS) {
    const r = byId.get(id);
    if (!r) continue;
    const highlights = r.highlights
      .map((h) => ({ text: h.text, items: h.items.filter((i) => titles.has(i)).map((i) => ({ id: i, title: titles.get(i)! })) }))
      .filter((h) => h.items.length > 0);
    competitors.push({ id, name: competitorName(id), topic: topicOf(id), itemCount: r.item_count, summary: r.summary, highlights, generatedAt: r.generated_at.toISOString() });
  }
  competitors.sort((a, b) => Number(b.itemCount > 0) - Number(a.itemCount > 0));
  const { first, last } = weekWindow(week);
  return { week, first, last, competitors };
}

/** 每个竞品最近一份有内容的汇总，给主题页用。 */
export async function latestDigests(now = new Date()): Promise<Record<string, CompetitorDigest & { week: string; first: string; last: string }>> {
  const out: Record<string, CompetitorDigest & { week: string; first: string; last: string }> = {};
  const rows = await sql<{ entity_id: string; week: string }[]>`
    SELECT DISTINCT ON (entity_id) entity_id, week FROM competitor_weekly WHERE item_count > 0 ORDER BY entity_id, week DESC`;
  const weeks = [...new Set(rows.map((r) => r.week))];
  for (const week of weeks) {
    const digests = await weekDigests(week, now);
    for (const d of digests?.competitors ?? []) {
      if (rows.some((r) => r.entity_id === d.id && r.week === week)) out[d.id] = { ...d, week, first: digests!.first, last: digests!.last };
    }
  }
  return out;
}
