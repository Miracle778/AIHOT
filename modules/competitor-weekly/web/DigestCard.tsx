// 一个竞品一周的汇总：一句总结，几条主要变化，每条链回支撑它的条目。
import type { ReactNode } from "react";
import { IntentLink } from "../../../apps/web/app/components/ui/IntentLink";
import type { CompetitorDigest } from "./types";

export function DigestCard({ d, heading }: { d: CompetitorDigest; heading?: ReactNode }) {
  return (
    <article className="card px-5 py-4 lg:px-6 lg:py-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {heading ?? (
          <h2 className="text-[16px] font-bold text-ink">
            {d.topic ? (
              <IntentLink to={`/topics/${d.topic}`} className="transition-colors hover:text-accent">
                {d.name}
              </IntentLink>
            ) : (
              d.name
            )}
          </h2>
        )}
        <span className="text-[12px] text-ink-4">
          本周收录 <span className="num font-semibold text-ink-3">{d.itemCount}</span> 条动态
        </span>
      </header>
      {d.summary && <p className="mt-2.5 text-[14px] leading-[1.8] text-ink-2">{d.summary}</p>}
      {d.highlights.length > 0 && (
        <ol className="mt-3 space-y-2.5 border-t border-line-soft pt-3">
          {d.highlights.map((h, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.75] text-ink-2">
              <span className="num mt-[1px] w-4 shrink-0 text-right text-[12px] font-semibold text-ink-4">{i + 1}</span>
              <span className="min-w-0">
                {h.text}
                <span className="ml-1.5 inline-flex flex-wrap gap-x-2 align-baseline">
                  {h.items.map((it, j) => (
                    <IntentLink key={it.id} to={`/items/${it.id}`} title={it.title} className="text-[12px] text-accent hover:underline">
                      来源{h.items.length > 1 ? j + 1 : ""}
                    </IntentLink>
                  ))}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {!d.summary && d.highlights.length === 0 && <p className="mt-2.5 text-[13px] text-ink-4">本周的动态还没有可用的汇总，可以去它的主题页看原始条目。</p>}
    </article>
  );
}
