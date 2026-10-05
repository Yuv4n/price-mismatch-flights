'use client';

import { getMarket } from '@/lib/markets';
import { getSite } from '@/lib/sites';
import type { MarketStatus, StreamingPreview } from '@/hooks/use-price-compare';

const STATUS_STYLE: Record<MarketStatus, string> = {
  queued: 'bg-zinc-800 text-zinc-400',
  running: 'bg-sky-500/20 text-sky-300 animate-pulse',
  done: 'bg-emerald-500/20 text-emerald-300',
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
      <h2 className="text-sm font-medium text-zinc-400">
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
            <div key={key} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
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
                  className="aspect-video w-full border-t border-zinc-800"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center border-t border-zinc-800 px-4 text-center text-xs text-zinc-500">
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
