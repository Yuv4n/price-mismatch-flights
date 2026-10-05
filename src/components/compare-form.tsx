'use client';

import { useState } from 'react';
import { DEFAULT_MARKETS, MARKETS } from '@/lib/markets';
import type { CompareRequest } from '@/hooks/use-price-compare';

const EXAMPLES = [
  {
    label: 'Flight · Google Flights',
    url: 'https://www.google.com/travel/flights?q=Flights%20from%20LHR%20to%20JFK%20on%202026-11-12%20one%20way',
    target: 'Cheapest one-way economy flight LHR to JFK on 12 Nov 2026',
  },
  {
    label: 'Hotel · Booking.com',
    url: 'https://www.booking.com/searchresults.html?ss=Paris&checkin=2026-11-12&checkout=2026-11-13&group_adults=2&no_rooms=1',
    target: 'Price of the first hotel in the results for 1 night, 2 adults',
  },
  {
    label: 'Activity · GetYourGuide',
    url: 'https://www.getyourguide.com/s/?q=Eiffel%20Tower%20summit%20ticket',
    target: 'Price of the first Eiffel Tower summit ticket listed, 1 adult',
  },
];

export function CompareForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (req: CompareRequest) => void;
  disabled: boolean;
}) {
  const [url, setUrl] = useState(EXAMPLES[0].url);
  const [target, setTarget] = useState(EXAMPLES[0].target);
  const [markets, setMarkets] = useState<string[]>(DEFAULT_MARKETS);

  const toggle = (code: string) =>
    setMarkets((m) => (m.includes(code) ? m.filter((x) => x !== code) : [...m, code]));

  return (
    <form
      className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ url, target, markets });
      }}
    >
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => {
              setUrl(ex.url);
              setTarget(ex.target);
            }}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-zinc-400">Booking page URL (flight, hotel, activity…)</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-zinc-400">What should the agent price?</span>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-1">
        <span className="text-sm text-zinc-400">Check from these countries</span>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => toggle(m.code)}
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
        disabled={disabled || !markets.length}
        className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-zinc-950 hover:bg-sky-400 disabled:opacity-50"
      >
        {disabled ? 'Agents running…' : `Compare across ${markets.length} countries`}
      </button>
    </form>
  );
}
