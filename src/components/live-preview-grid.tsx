'use client';

import { getMarket } from '@/lib/markets';
import { getSite } from '@/lib/sites';
import type { MarketStatus, StreamingPreview } from '@/hooks/use-price-compare';

const STATUS_STYLE: Record<MarketStatus, string> = {
  queued: 'bg-stone-800 text-stone-400',
  running: 'bg-fish/15 text-fish animate-pulse',
  done: 'bg-sage/25 text-stone-200',
  failed: 'bg-rose-500/20 text-rose-300',
};

export function LivePreviewGrid({
  previews,
  status,
  errors,
}: {
  previews: StreamingPreview[];
  status: Record<string, MarketStatus>;
  errors: Record<string, string>;
}) {
  const keys = Object.keys(status);
  if (!keys.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
        TinyFish agents (one per site × country proxy)
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {keys.map((key) => {
          const [siteId, marketCode] = key.split(':');
          const site = getSite(siteId);
          const m = getMarket(marketCode);
          const preview = previews.find((p) => p.key === key);
          const s = status[key];
          return (
            <div key={key} className="overflow-hidden rounded-lg border border-stone-800/80 bg-stone-950">
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {site?.name} · {m?.flag} {m?.name}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[s]}`}>{s}</span>
              </div>
              {preview && !preview.done ? (
                <iframe
                  src={preview.streamingUrl}
                  title={`Live agent — ${site?.name} from ${m?.name}`}
                  className="aspect-video w-full border-t border-stone-800"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center border-t border-stone-800 px-4 text-center text-xs text-stone-500">
                  {s === 'queued' && 'Waiting for a free agent slot…'}
                  {s === 'running' && 'Starting browser…'}
                  {s === 'done' && 'Price captured'}
                  {s === 'failed' && (errors[key] ?? 'Agent failed')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
