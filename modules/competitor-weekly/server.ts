// 竞品周汇总接进后端的插口：定时任务、模型步骤、页面接口、管理员重写，以及竞品主题页顶部的部件。
import { z } from "zod";
import { defineServerModule } from "@aihot/backend/modules";
import { isoWeekLabel, beijingDate } from "@aihot/contracts/time";
import { adminHandler } from "@aihot/api/routes/admin-auth";
import { COMPETITORS, STEP, composeDigest, composeDueDigests } from "./backend/compose.ts";
import { digestWeeks, latestDigests, weekDigests } from "./backend/read.ts";

const WEEK = /^\d{4}-W\d{2}$/;

export default defineServerModule({
  name: "competitor-weekly",
  models: {
    [STEP]: { label: "竞品周汇总", env: "COMPETITOR_WEEKLY_MODEL", purposes: ["competitor_weekly"] },
  },
  // 每小时看一次上一个完整周是否写完：周一凌晨起就能写上周的，漏掉或失败的下一个小时补上。
  schedules: [{ name: "competitor-weekly.compose", cron: "25 * * * *", missed: "once", run: () => composeDueDigests() }],
  http(app) {
    app.get("/api/site/competitor-weekly", async (req, reply) => {
      const q = z.object({ week: z.string().regex(WEEK).optional() }).safeParse(req.query);
      if (!q.success) return reply.code(400).send({ title: "Invalid request", status: 400, detail: "week must look like 2026-W45." });
      const weeks = await digestWeeks();
      const week = q.data.week ?? weeks[0];
      const digests = week ? await weekDigests(week) : null;
      reply.header("Cache-Control", "public, max-age=60");
      return { weeks, current: isoWeekLabel(beijingDate(new Date())), digests };
    });
    // 管理员重写某一周（也可以写本周至今，开会前看一眼用）：{ week, reason, competitors? }
    app.post("/api/admin/competitor-weekly/compose", adminHandler(async (req) => {
      const b = z.object({ week: z.string().regex(WEEK), reason: z.string().min(1).max(200), competitors: z.array(z.enum(COMPETITORS)).optional() }).parse(req.body);
      const result: Record<string, string> = {};
      for (const id of b.competitors ?? COMPETITORS) {
        try {
          result[id] = await composeDigest(id, b.week, b.reason);
        } catch (error) {
          result[id] = `failed: ${(error as Error).message.slice(0, 120)}`;
        }
      }
      return { week: b.week, result };
    }));
  },
  topics: {
    page: {
      index: () => latestDigests(),
      // 汇总引用的条目大多不是精选，不在主题成员里；它们的公开状态在读汇总时（最多一分钟前）已经核对过。
      read: (ask) => {
        const id = ask.topic.entityId;
        const all = ask.index as Awaited<ReturnType<typeof latestDigests>> | undefined;
        const digest = id ? all?.[id] : undefined;
        if (!digest) return null;
        return { recheck: [], part: () => digest };
      },
    },
  },
});
