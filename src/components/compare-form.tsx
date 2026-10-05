'use client';

import { useState } from 'react';
import { AIRPORTS, DEFAULT_DESTINATION, DEFAULT_ORIGIN } from '@/lib/airports';
import { DEFAULT_MARKETS, MARKETS } from '@/lib/markets';
import { DEFAULT_SITES, SITES } from '@/lib/sites';
import type { CompareRequest } from '@/hooks/use-price-compare';
import { DateCalendar } from '@/components/date-calendar';

const PRESETS = [
  { label: 'London → New York', origin: 'LHR', destination: 'JFK' },
  { label: 'London → Bangkok', origin: 'LHR', destination: 'BKK' },
  { label: 'Paris → Tokyo', origin: 'CDG', destination: 'HND' },
];

const daysOut = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const sixWeeksOut = () => daysOut(42);

const QUICK_DATES = [
  { label: 'Tomorrow', days: 1 },
  { label: '+1 week', days: 7 },
  { label: '+1 month', days: 30 },
  { label: '+3 months', days: 91 },
];

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

  const [calendarKey, setCalendarKey] = useState(0);

  const invalid = origin === destination || !sites.length || !markets.length;
  const agentCount = sites.length * markets.length;
  const pickDate = (iso: string) => {
    setDate(iso);
    setCalendarKey((k) => k + 1); // re-centre the calendar on the picked month
  };

  return (
    <form
      className="space-y-4 rounded-xl border border-stone-800/80 bg-stone-950 p-6"
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
            className="rounded-full border border-stone-800 px-3 py-1 text-xs text-stone-400 transition hover:border-stone-600 hover:text-fish"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">From</span>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm hover:border-stone-500"
            >
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city} ({a.name})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
            className="mx-auto block rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 transition hover:rotate-180 hover:bg-stone-800"
            aria-label="Swap origin and destination"
          >
            ⇅
          </button>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">To</span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm hover:border-stone-500"
            >
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city} ({a.name})
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Quick dates</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_DATES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => pickDate(daysOut(q.days))}
                  className={`rounded-full border px-3 py-1 text-xs hover:bg-stone-800 ${
                    date === daysOut(q.days) ? 'border-fish text-fish' : 'border-stone-700 text-stone-300'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Departure (one-way)</span>
          <DateCalendar key={calendarKey} value={date} onChange={setDate} />
        </div>
      </div>

      {origin === destination && (
        <p className="text-sm text-amber-400">Origin and destination must be different.</p>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Search these sites</span>
          <button
            type="button"
            onClick={() => setSites(sites.length === SITES.length ? [] : SITES.map((x) => x.id))}
            className="text-xs text-stone-500 transition hover:text-fish"
          >
            {sites.length === SITES.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSites((list) => toggleIn(list, s.id))}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                sites.includes(s.id)
                  ? 'border-fish bg-fish/10 text-fish'
                  : 'border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">…browsed from these countries</span>
          <button
            type="button"
            onClick={() => setMarkets(markets.length === MARKETS.length ? [] : MARKETS.map((x) => x.code))}
            className="text-xs text-stone-500 transition hover:text-fish"
          >
            {markets.length === MARKETS.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => setMarkets((list) => toggleIn(list, m.code))}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                markets.includes(m.code)
                  ? 'border-fish bg-fish/10 text-fish'
                  : 'border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200'
              }`}
            >
              {m.flag} {m.code}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={disabled || invalid}
        className="rounded-lg bg-fish px-5 py-2.5 text-sm font-medium text-white transition hover:bg-fish-dark disabled:opacity-50"
      >
        {disabled
          ? 'Agents running…'
          : `Compare ${sites.length} site${sites.length === 1 ? '' : 's'} × ${markets.length} countr${markets.length === 1 ? 'y' : 'ies'}`}
      </button>
      <span className="text-xs text-stone-500">
        {agentCount} browser agent{agentCount === 1 ? '' : 's'} will run
        {agentCount > 12 ? ' — this can take several minutes' : ''}
      </span>
      </div>
    </form>
  );
}
