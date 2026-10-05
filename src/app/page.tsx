'use client';

import { CompareForm } from '@/components/compare-form';
import { LivePreviewGrid } from '@/components/live-preview-grid';
import { PriceTable } from '@/components/price-table';
import { usePriceCompare } from '@/hooks/use-price-compare';

export default function Home() {
  const { rows, previews, status, errors, isRunning, elapsed, fxLoaded, error, run } =
    usePriceCompare();

  const states = Object.values(status);
  const finished = states.filter((s) => s === 'done' || s === 'failed').length;
  const running = states.filter((s) => s === 'running').length;
  const pct = states.length ? Math.round((finished / states.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
      <nav className="flex items-center justify-between border-b border-stone-900 pb-5">
        <span className="flex items-center gap-2 text-sm font-medium tracking-tight">
          <span className="h-2 w-2 rounded-full bg-fish" />
          Geo Fare Gap
        </span>
        <span className="font-mono text-[11px] text-stone-500">TinyFish Agent · Fetch</span>
      </nav>

      <header className="space-y-4 pt-6">
        <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Same seat.
          <br />
          <span className="text-stone-500">Different country, different price.</span>
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-stone-400">
          Browser agents search your route on up to 9 flight sites from up to 7 countries at once,
          each through a local proxy, then rank every fare in GBP so you can see where it&apos;s cheapest.
        </p>
      </header>

      <CompareForm onSubmit={run} disabled={isRunning} />

      {error && (
        <p className="rounded-lg border border-rose-500/30 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {(isRunning || elapsed) && (
        <p className="font-mono text-[11px] text-stone-500">
          {fxLoaded ? 'Live GBP exchange rates loaded via TinyFish Fetch. ' : ''}
          {elapsed ? `Finished in ${elapsed}.` : 'Agents are browsing…'}
        </p>
      )}

      {states.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-400">
            <span>
              {finished}/{states.length} agents finished · {running} browsing now
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-px overflow-hidden bg-stone-800">
            <div
              className={`h-full rounded-full bg-fish transition-all duration-500 ${isRunning ? 'animate-pulse' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <PriceTable rows={rows} />
      <LivePreviewGrid previews={previews} status={status} errors={errors} />
      <footer className="border-t border-stone-900 pt-6 font-mono text-[11px] text-stone-600">
        Live prices only · no cache · built with TinyFish
      </footer>
    </main>
  );
}
