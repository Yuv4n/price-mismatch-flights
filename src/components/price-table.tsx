'use client';

import { getMarket } from '@/lib/markets';
import { rankRows, type PriceRow } from '@/lib/normalize';

const gbp = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

export function PriceTable({ rows }: { rows: PriceRow[] }) {
  if (!rows.length) return null;
  const ranked = rankRows(rows);
  const priced = ranked.filter((r) => r.priceGbp != null);
  const cheapest = priced[0];
  const dearest = priced[priced.length - 1];
  const spread = cheapest && dearest ? (dearest.priceGbp as number) - (cheapest.priceGbp as number) : 0;

  const downloadCsv = () => {
    const header = 'market,site,product,price_local,currency,price_gbp,gap_gbp,gap_pct,locale_shown,notes';
    const lines = ranked.map((r) =>
      [r.market, r.siteName, r.product, r.price, r.currency, r.priceGbp, r.gapGbp, r.gapPct, r.localeShown, r.notes]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `geo-fare-gap-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <section className="space-y-4">
      {priced.length > 1 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-300">Cheapest market</p>
          <p className="text-2xl font-semibold">
            {getMarket(cheapest.market)?.flag} {getMarket(cheapest.market)?.name}: {gbp(cheapest.priceGbp)}
          </p>
          <p className="text-sm text-zinc-300">
            Booking from {getMarket(dearest.market)?.name} costs {gbp(spread)} more
            {cheapest.priceGbp ? ` (+${((spread / (cheapest.priceGbp as number)) * 100).toFixed(1)}%)` : ''}.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-zinc-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Seen from</th>
              <th className="p-3">Price shown</th>
              <th className="p-3">In GBP</th>
              <th className="p-3">vs cheapest</th>
              <th className="p-3">Site region</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr
                key={r.market}
                className={`border-t border-zinc-800 ${r.isCheapest ? 'bg-emerald-500/5' : ''}`}
              >
                <td className="p-3 text-zinc-500">{r.rank ?? '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  {getMarket(r.market)?.flag} {getMarket(r.market)?.name}
                </td>
                <td className="p-3 font-mono">{r.priceText || '—'}</td>
                <td className="p-3 font-mono font-semibold">{gbp(r.priceGbp)}</td>
                <td className={`p-3 font-mono ${r.gapGbp ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {r.gapGbp == null ? '—' : r.gapGbp === 0 ? 'cheapest' : `+${gbp(r.gapGbp)} (${r.gapPct}%)`}
                </td>
                <td className="p-3 text-zinc-400">{r.localeShown || '—'}</td>
                <td className="p-3 text-zinc-400 max-w-xs">{r.notes || r.product}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={downloadCsv}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        Download CSV
      </button>
    </section>
  );
}
