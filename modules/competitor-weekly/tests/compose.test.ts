// 竞品周汇总：写哪些条目由规则决定（这一周、以它为主体、仍公开），模型只写文字；
// 引用不存在的编号、写出条目里没有的名称或数字的句子不用；没有条目的一周不调用模型；
// 撤下的条目在读汇总时不再出现；定时任务不重写已有的汇总，管理员带理由可以重写。
import { pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { beijingAt, isoWeekRange } from "@aihot/contracts/time";
import competitorWeekly from "../server.ts";
import { composeDigest, weekItems } from "../backend/compose.ts";
import { weekDigests } from "../backend/read.ts";

installModules([competitorWeekly]);

const T = tag();
const SOURCE = `test-cw-${T}`;
const WEEK = "2097-W10";
const QUIET_WEEK = "2097-W11";
const monday = isoWeekRange(WEEK)!.start;

let calls = 0;
const provider = await stub(() => {
  calls += 1;
  // 编号 1、2 是真实条目；9 不存在；第三条写了条目里没有的产品名。
  const content = {
    summary: "本周新增 Monitor 工具，并调整了成本报表。",
    highlights: [
      { text: "新增 Monitor 工具，可监控插件", items: [1, 9] },
      { text: "成本报表支持按团队查看", items: [2] },
      { text: "接入 Gemini 9 Ultra 模型", items: [1] },
      { text: "只引用了不存在的条目", items: [9] },
    ],
  };
  return { id: `stub-${calls}`, model: "stub", choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
});
after(async () => {
  await provider.close();
  await closeDb();
});
process.env.COMPETITOR_WEEKLY_MODEL = "deepseek-flash";
pointModels(provider.url, ["deepseek-flash"]);

await sql`INSERT INTO sources (id, name, kind, tier, participation_mode) VALUES (${SOURCE}, 'CW fixture', 'rss', 'T1', 'editorial')`;

async function item(n: number, title: string, summary: string, opts: { entity?: string; at?: Date; score?: number } = {}) {
  const id = `${SOURCE}-${n}`;
  const at = opts.at ?? beijingAt(monday, "10:00");
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, timeline_at, discovered_at)
    VALUES (${id}, ${SOURCE}, ${id}, ${`https://example.org/${id}`}, ${title}, ${at}, ${at})`;
  await sql`INSERT INTO publications (article_id, source_id, title, summary, url, timeline_at, discovered_at, sort_at, selected, eligible, visible_after, tags, channel, category, score)
    VALUES (${id}, ${SOURCE}, ${title}, ${summary}, ${`https://example.org/${id}`}, ${at}, ${at}, ${at}, false, true, ${at}, ${[`entity:${opts.entity ?? "claude-code"}`, "产品更新"]}, 'news', 'products', ${opts.score ?? 40})`;
  return id;
}

const monitor = await item(1, "Claude Code v2.1.310 新增 Monitor 工具", "新增 Monitor 工具，可以监控插件运行。", { score: 45 });
const costs = await item(2, "Claude Code v2.1.317 新增成本报表", "成本报表支持按团队查看用量。", { score: 38 });
await item(3, "Codex CLI 更新", "另一家竞品的条目。", { entity: "codex" });
await item(4, "上一周的 Claude Code 条目", "不在这一周。", { at: new Date(beijingAt(monday, "00:00").getTime() - 3600_000) });

test("a week's items are the competitor's own, inside the week, best scored first", async () => {
  const items = await weekItems("claude-code", WEEK);
  assert.deepEqual(items.map((i) => i.id), [monitor, costs]);
});

test("the digest keeps only grounded sentences that cite real items; an empty week calls no model", async () => {
  assert.equal(await composeDigest("claude-code", WEEK), "written");
  const [row] = await sql<{ summary: string | null; highlights: Array<{ text: string; items: string[] }>; item_count: number }[]>`
    SELECT summary, highlights, item_count FROM competitor_weekly WHERE week = ${WEEK} AND entity_id = 'claude-code'`;
  assert.equal(row!.item_count, 2);
  assert.match(row!.summary!, /Monitor/);
  assert.deepEqual(row!.highlights, [
    { text: "新增 Monitor 工具，可监控插件", items: [monitor] },
    { text: "成本报表支持按团队查看", items: [costs] },
  ]);
  const before = calls;
  assert.equal(await composeDigest("claude-code", QUIET_WEEK), "empty");
  assert.equal(calls, before, "no model call for a week without items");
});

test("the scheduled run keeps a written digest; an admin rewrite asks the model again", async () => {
  const before = calls;
  assert.equal(await composeDigest("claude-code", WEEK), "kept");
  assert.equal(calls, before);
  assert.equal(await composeDigest("claude-code", WEEK, "重写"), "written");
  assert.equal(calls, before + 1);
});

test("a withdrawn item leaves the digest when it is read", async () => {
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${costs}`;
  const week = await weekDigests(WEEK);
  const cc = week!.competitors.find((c) => c.id === "claude-code")!;
  assert.deepEqual(cc.highlights.map((h) => h.items.map((i) => i.id)), [[monitor]]);
  assert.equal(cc.topic, "claude-code");
});
