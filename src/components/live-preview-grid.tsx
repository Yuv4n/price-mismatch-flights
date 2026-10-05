'use client';

import { getMarket } from '@/lib/markets';
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
  const markets = Object.keys(status);
  if (!markets.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-400">TinyFish agents (one per country proxy)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {markets.map((code) => {
          const m = getMarket(code);
          const preview = previews.find((p) => p.market === code);
          const s = status[code];
          return (
            <div key={code} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {m?.flag} {m?.name}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[s]}`}>{s}</span>
              </div>
              {preview && !preview.done ? (
                <iframe
                  src={preview.streamingUrl}
                  title={`Live agent — ${m?.name}`}
                  className="aspect-video w-full border-t border-zinc-800"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center border-t border-zinc-800 px-4 text-center text-xs text-zinc-500">
                  {s === 'queued' && 'Waiting for a free agent slot…'}
                  {s === 'running' && 'Starting browser…'}
                  {s === 'done' && 'Price captured'}
                  {s === 'failed' && (errors[code] ?? 'Agent failed')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
