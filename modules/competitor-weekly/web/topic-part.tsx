// 竞品主题页顶部：这个竞品最近一周的汇总。
import type { TopicPagePart } from "../../../apps/web/app/modules";
import { IntentLink } from "../../../apps/web/app/components/ui/IntentLink";
import { DigestCard } from "./DigestCard";
import { shortDate, weekName, type CompetitorDigest } from "./types";

type Latest = CompetitorDigest & { week: string; first: string; last: string };

const part: TopicPagePart = {
  name: "竞品周汇总",
  shows: (data) => !!data,
  Block: ({ data }) => {
    const d = data as Latest;
    return (
      <div className="mt-4">
        <DigestCard
          d={d}
          heading={
            <h2 className="text-[15px] font-bold text-ink">
              <IntentLink to={`/competitors/weekly/${d.week}`} className="transition-colors hover:text-accent">
                {weekName(d.week)}汇总
              </IntentLink>
              <span className="ml-2 text-[12px] font-normal text-ink-4">
                {shortDate(d.first)} 至 {shortDate(d.last)}
              </span>
            </h2>
          }
        />
      </div>
    );
  },
  entries: () => [],
  news: (data) => ((data as Latest | null)?.summary ? [(data as Latest).summary!] : []),
};

export default part;
