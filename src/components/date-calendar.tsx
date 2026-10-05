'use client';

import { useState } from 'react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const t = new Date();
  return toIso(t.getFullYear(), t.getMonth(), t.getDate());
};

/** Month-grid date picker. Value is ISO YYYY-MM-DD; past days are disabled. */
export function DateCalendar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [y0, m0] = value.split('-').map(Number);
  const [view, setView] = useState({ year: y0, month: m0 - 1 });
  const today = todayIso();
  const now = new Date();
  const atCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const selectedLabel = new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={atCurrentMonth}
          aria-label="Previous month"
          className="rounded-md px-2 py-1 text-stone-300 hover:bg-stone-800 disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="rounded-md px-2 py-1 text-stone-300 hover:bg-stone-800"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-stone-500">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <span key={`blank-${i}`} />;
          const iso = toIso(view.year, view.month, day);
          const past = iso < today;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => onChange(iso)}
              className={`rounded-md py-1.5 transition ${
                selected
                  ? 'bg-fish font-semibold text-white'
                  : past
                    ? 'text-stone-700'
                    : iso === today
                      ? 'text-stone-100 ring-1 ring-fish/60 hover:bg-stone-800'
                      : 'text-stone-200 hover:bg-stone-800'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-stone-400">
        Departing <span className="text-stone-100">{selectedLabel}</span>
      </p>
    </div>
  );
}
