// 竞品周汇总：一个竞品一周的全部动态（版本更新、博客、公告，不只是精选），由模型写成一句总结和几条主要变化。
// 高频小步发版的竞品（Claude Code 几乎每天一个版本）单条很难过精选门槛，一周累积起来的变化却很重要；
// 汇总按周、按竞品看，正好补上这一块。模型只写文字，写哪些条目由规则决定；写出原文没有的名称或数字的句子不用。
import { z } from "zod";
import { ENTITIES } from "@aihot/industry/taxonomy";
import { addDays, beijingAt, beijingDate, isoWeekLabel, isoWeekRange } from "@aihot/contracts/time";
import { sql } from "@aihot/backend/db";
import { promptText, promptVersion } from "@aihot/backend/editorial/prompts";
import { modelFor } from "@aihot/backend/editorial/models";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { listedCondition } from "@aihot/backend/publication/scope";
import { grounded } from "@aihot/backend/reports/compose";
import { logError } from "@aihot/backend/lib/log-error";

/** 要汇总的竞品（taxonomy 的主体 id），按页面上的顺序。 */
export const COMPETITORS = ["claude-code", "codex", "copilot", "cursor", "qoder", "codebuddy", "trae", "opencode", "pi"] as const;

export const STEP = "competitorWeekly";
const PROMPT = "competitor-weekly";
const VERSION = promptVersion(PROMPT);
/** 一周最多交给模型的条目数（按分数取）。 */
const MAX_ITEMS = 40;
const MAX_HIGHLIGHTS = 6;

export const DigestSchema = z.object({
  summary: z.string().max(600).catch(""),
  highlights: z.array(z.object({ text: z.string().max(300), items: z.array(z.number().int()).max(6).catch([]) })).max(10).catch([]),
});

export interface WeekItem {
  id: string;
  title: string;
  summary: string;
  at: Date;
}

/** 周的起止：北京时间周一 00:00 到下周一 00:00。 */
export function weekWindow(week: string): { start: Date; end: Date; first: string; last: string } {
  const range = isoWeekRange(week);
  if (!range) throw new Error(`bad week label ${week}`);
  return { start: beijingAt(range.start, "00:00"), end: beijingAt(addDays(range.end, 1), "00:00"), first: range.start, last: range.end };
}

/** 上一个完整的周。 */
export function lastFullWeek(now = new Date()): string {
  return isoWeekLabel(addDays(beijingDate(now), -7));
}

export function competitorName(id: string): string {
  return ENTITIES[id]?.name ?? id;
}

/** 这一周以它为主体、现在仍公开的条目，分数高的在前。 */
export async function weekItems(entityId: string, week: string, now = new Date()): Promise<WeekItem[]> {
  const { start, end } = weekWindow(week);
  return sql<WeekItem[]>`
    SELECT p.article_id AS id, p.title, coalesce(p.summary, '') AS summary, p.timeline_at AS at
    FROM publications p
    WHERE ${listedCondition(now)} AND p.tags @> ARRAY[${`entity:${entityId}`}]::text[]
      AND p.timeline_at >= ${start} AND p.timeline_at < ${end}
    ORDER BY p.score DESC NULLS LAST, p.timeline_at DESC
    LIMIT ${MAX_ITEMS}`;
}

export function digestPrompt(entityId: string, week: string, items: WeekItem[]) {
  const { first, last } = weekWindow(week);
  const list = items.map((it, i) => `[${i + 1}] ${beijingDate(it.at)}｜${it.title}｜${it.summary.slice(0, 220)}`).join("\n");
  return {
    system: promptText(PROMPT, { competitor: competitorName(entityId) }),
    user: `竞品：${competitorName(entityId)}\n本周：${first} 至 ${last}\n条目共 ${items.length} 条：\n${list}`,
  };
}

/** 模型的回答里能用的部分：引用的编号要真实存在，文字不能写出条目里没有的名称和数字。 */
export function usableDigest(data: z.infer<typeof DigestSchema>, items: WeekItem[]) {
  const corpus = items.map((it) => `${it.title} ${it.summary}`).join("\n");
  const summary = data.summary.trim() && grounded(data.summary, corpus) ? data.summary.trim() : null;
  const highlights = data.highlights
    .map((h) => ({ text: h.text.trim(), items: [...new Set(h.items)].filter((n) => n >= 1 && n <= items.length).map((n) => items[n - 1]!.id) }))
    .filter((h) => h.text && h.items.length > 0 && grounded(h.text, corpus))
    .slice(0, MAX_HIGHLIGHTS);
  return { summary, highlights };
}

/**
 * 写一个竞品一周的汇总。没有 reason 时（定时任务）已经写过的不再写；有 reason 时（管理员重写）覆盖。
 * 这一周没有条目的竞品也记一行（0 条），页面据此显示“本周没有收录到动态”，不调用模型。
 */
export async function composeDigest(entityId: string, week: string, reason?: string): Promise<"written" | "kept" | "empty"> {
  if (reason === undefined) {
    const [have] = await sql`SELECT 1 FROM competitor_weekly WHERE week = ${week} AND entity_id = ${entityId}`;
    if (have) return "kept";
  }
  const items = await weekItems(entityId, week);
  if (!items.length) {
    await sql`INSERT INTO competitor_weekly (week, entity_id, item_count) VALUES (${week}, ${entityId}, 0)
      ON CONFLICT (week, entity_id) DO UPDATE SET summary = NULL, highlights = '[]', item_ids = '{}', item_count = 0, model = NULL, receipt_id = NULL, generated_at = now()`;
    return "empty";
  }
  const model = await modelFor(STEP);
  const res = await chatJson({
    model, purpose: "competitor_weekly", subject: `competitor-weekly:${week}:${entityId}`, promptVersion: VERSION,
    ...digestPrompt(entityId, week, items), schema: DigestSchema, temperature: 0.3, maxTokens: 2000,
    ...(reason === undefined ? {} : { attemptTag: `rewrite:${Date.now()}` }),
  });
  const { summary, highlights } = usableDigest(res.data, items);
  await sql.begin(async (tx) => {
    await tx`INSERT INTO competitor_weekly (week, entity_id, summary, highlights, item_ids, item_count, model, receipt_id)
      VALUES (${week}, ${entityId}, ${summary}, ${tx.json(highlights as never)}, ${items.map((it) => it.id)}, ${items.length}, ${res.model}, ${res.receiptId})
      ON CONFLICT (week, entity_id) DO UPDATE SET summary = EXCLUDED.summary, highlights = EXCLUDED.highlights, item_ids = EXCLUDED.item_ids,
        item_count = EXCLUDED.item_count, model = EXCLUDED.model, receipt_id = EXCLUDED.receipt_id, generated_at = now()`;
    await completeReceipt(tx, res.receiptId);
  });
  return "written";
}

/** 定时任务：上一个完整周还没写的竞品都写上。一个失败不耽误其他的，下一次再试。 */
export async function composeDueDigests(now = new Date()): Promise<{ week: string; written: string[]; failed: string[] }> {
  const week = lastFullWeek(now);
  const written: string[] = [];
  const failed: string[] = [];
  for (const id of COMPETITORS) {
    try {
      if ((await composeDigest(id, week)) !== "kept") written.push(id);
    } catch (error) {
      failed.push(id);
      console.error(JSON.stringify({ level: "error", msg: "competitor weekly failed", week, competitor: id, error: logError(error) }));
    }
  }
  if (failed.length) throw new Error(`competitor weekly ${week}: ${failed.join(", ")} failed`);
  return { week, written, failed };
}
