// 竞品周汇总页：/competitors/weekly 是最新一周，/competitors/weekly/2026-W45 是指定的一周。
import { useLoaderData } from "react-router";
import { SITE } from "@aihot/site";
import { apiGet, cachedPage } from "../../../apps/web/app/lib/api.server";
import { pageReuse } from "../../../apps/web/app/lib/page-reuse";
import { pageMeta } from "../../../apps/web/app/lib/seo";
import { IntentLink } from "../../../apps/web/app/components/ui/IntentLink";
import { EmptyState } from "../../../apps/web/app/components/ui/Page";
import { PhoneBar } from "../../../apps/web/app/components/shell/PhoneBar";
import type { Screen } from "../../../apps/web/app/components/shell/screens";
import { DigestCard } from "./DigestCard";
import { shortDate, weekName, type CompetitorWeeklyResponse } from "./types";

export const handle: Screen = { name: "竞品周汇总" };
export { pageHeaders as headers } from "../../../apps/web/app/lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request, params }: { request: Request; params: { week?: string } }) {
  const q = params.week ? `?week=${encodeURIComponent(params.week)}` : "";
  return cachedPage(60, await apiGet<CompetitorWeeklyResponse>(`/api/site/competitor-weekly${q}`, { signal: request.signal }));
}

export function meta({ loaderData }: { loaderData?: CompetitorWeeklyResponse }) {
  const d = loaderData?.digests;
  const title = d ? `竞品周汇总 · ${weekName(d.week)}` : "竞品周汇总";
  return pageMeta({
    title,
    description: `${SITE.name} 每周为每个编码 Agent 竞品写一份汇总：这一周它在能力、体验、生态和商业上变了什么。`,
    path: d ? `/competitors/weekly/${d.week}` : "/competitors/weekly",
  });
}

export default function CompetitorWeeklyPage() {
  const { weeks, digests } = useLoaderData<typeof loader>();
  const active = digests?.competitors.filter((c) => c.itemCount > 0) ?? [];
  const quiet = digests?.competitors.filter((c) => c.itemCount === 0) ?? [];
  return (
    <div className="mx-auto max-w-[var(--page-max-reading)] pb-14">
      <PhoneBar title="竞品周汇总" />
      <header className="pb-2 pt-3 lg:pt-1">
        <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">竞品周汇总</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
          每周一为每个竞品把一周的全部动态（不只是精选）汇总成几条主要变化，每条都能点回原始条目。
        </p>
      </header>
      {weeks.length > 0 && (
        <nav aria-label="往期" className="mt-4 flex flex-wrap gap-2">
          {weeks.map((w) => (
            <IntentLink
              key={w}
              to={`/competitors/weekly/${w}`}
              aria-current={digests?.week === w ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${digests?.week === w ? "border-accent bg-accent text-white" : "border-line text-ink-3 hover:text-ink"}`}
            >
              {weekName(w).replace(/^\d{4} 年/, "")}
            </IntentLink>
          ))}
        </nav>
      )}
      {!digests ? (
        <div className="mt-8">
          <EmptyState title="还没有周汇总">第一份会在每周一写好上一周的；有动态的竞品一份一张卡片。</EmptyState>
        </div>
      ) : (
        <>
          <p className="mt-5 text-[13px] text-ink-4">
            {weekName(digests.week)} · {shortDate(digests.first)} 至 {shortDate(digests.last)}
          </p>
          <div className="mt-3 space-y-4">
            {active.map((d) => (
              <DigestCard key={d.id} d={d} />
            ))}
          </div>
          {quiet.length > 0 && (
            <p className="mt-6 text-[13px] text-ink-4">本周没有收录到动态：{quiet.map((d) => d.name).join("、")}</p>
          )}
        </>
      )}
    </div>
  );
}
