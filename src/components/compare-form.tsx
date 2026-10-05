'use client';

import { useState } from 'react';
import { AIRPORTS, DEFAULT_DESTINATION, DEFAULT_ORIGIN } from '@/lib/airports';
import { DEFAULT_MARKETS, MARKETS } from '@/lib/markets';
import { DEFAULT_SITES, SITES } from '@/lib/sites';
import type { CompareRequest } from '@/hooks/use-price-compare';

const PRESETS = [
  { label: 'London → New York', origin: 'LHR', destination: 'JFK' },
  { label: 'London → Bangkok', origin: 'LHR', destination: 'BKK' },
  { label: 'Paris → Tokyo', origin: 'CDG', destination: 'HND' },
];

const sixWeeksOut = () => new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

export function CompareForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (req: CompareRequest) => void;
  disabled: boolean;
}) {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [date, setDate] = useState(sixWeeksOut);
  const [sites, setSites] = useState<string[]>(DEFAULT_SITES);
  const [markets, setMarkets] = useState<string[]>(DEFAULT_MARKETS);

  const invalid = origin === destination || !sites.length || !markets.length;

  return (
    <form
      className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ origin, destination, date, markets, sites });
      }}
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setOrigin(p.origin);
              setDestination(p.destination);
            }}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">From</span>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.city} ({a.name})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">To</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.city} ({a.name})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Departure (one-way)</span>
          <input
            type="date"
            value={date}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            required
          />
        </label>
      </div>

      {origin === destination && (
        <p className="text-sm text-amber-400">Origin and destination must be different.</p>
      )}

      <div className="space-y-1">
        <span className="text-sm text-zinc-400">Search these sites</span>
        <div className="flex flex-wrap gap-2">
          {SITES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSites((list) => toggleIn(list, s.id))}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                sites.includes(s.id)
                  ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm text-zinc-400">…browsed from these countries</span>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => setMarkets((list) => toggleIn(list, m.code))}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                markets.includes(m.code)
                  ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {m.flag} {m.code}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || invalid}
        className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-zinc-950 hover:bg-sky-400 disabled:opacity-50"
      >
        {disabled
          ? 'Agents running…'
          : `Compare ${sites.length} site${sites.length === 1 ? '' : 's'} × ${markets.length} countr${markets.length === 1 ? 'y' : 'ies'}`}
      </button>
    </form>
  );
}
