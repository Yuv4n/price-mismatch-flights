'use client';

import { CompareForm } from '@/components/compare-form';
import { LivePreviewGrid } from '@/components/live-preview-grid';
import { PriceTable } from '@/components/price-table';
import { usePriceCompare } from '@/hooks/use-price-compare';

export default function Home() {
  const { rows, previews, status, errors, isRunning, elapsed, fxLoaded, error, run } =
    usePriceCompare();

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Geo Fare Gap</h1>
        <p className="text-zinc-400">
          Same flight, different country, different price. Pick a route and TinyFish browser
          agents search it on Google Flights, Kayak and Skyscanner from up to 7 countries at
          once — each through a local proxy — read the fare each location is shown, and convert
          everything to GBP so you can see where the same seat costs less.
        </p>
      </header>

      <CompareForm onSubmit={run} disabled={isRunning} />

      {error && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {(isRunning || elapsed) && (
        <p className="text-xs text-zinc-500">
          {fxLoaded ? 'Live GBP exchange rates loaded via TinyFish Fetch. ' : ''}
          {elapsed ? `Finished in ${elapsed}.` : 'Agents are browsing…'}
        </p>
      )}

      <PriceTable rows={rows} />
      <LivePreviewGrid previews={previews} status={status} errors={errors} />
    </main>
  );
}
