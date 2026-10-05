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
      [r.market, r.site || r.siteName, r.product, r.price, r.currency, r.priceGbp, r.gapGbp, r.gapPct, r.localeShown, r.notes]
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
        <div className="rounded-xl border border-stone-800/80 p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-fish">Cheapest market</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {cheapest.site} · {getMarket(cheapest.market)?.flag} {getMarket(cheapest.market)?.name}:{' '}
            {gbp(cheapest.priceGbp)}
          </p>
          <p className="mt-2 text-sm text-stone-400">
            Booking {dearest.site} from {getMarket(dearest.market)?.name} costs {gbp(spread)} more
            {cheapest.priceGbp ? ` (+${((spread / (cheapest.priceGbp as number)) * 100).toFixed(1)}%)` : ''}.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-stone-800">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Seen from</th>
              <th className="px-4 py-3 font-medium">Price shown</th>
              <th className="px-4 py-3 font-medium">In GBP</th>
              <th className="px-4 py-3 font-medium">vs cheapest</th>
              <th className="px-4 py-3 font-medium">Site region</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr
                key={r.jobKey}
                className={`border-t border-stone-800 ${r.isCheapest ? 'bg-fish/[0.05]' : ''}`}
              >
                <td className="px-4 py-3 text-stone-500">{r.rank ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.site || r.siteName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getMarket(r.market)?.flag} {getMarket(r.market)?.name}
                </td>
                <td className="px-4 py-3 font-mono">{r.priceText || '—'}</td>
                <td className="px-4 py-3 font-mono font-semibold">{gbp(r.priceGbp)}</td>
                <td className={`p-3 font-mono ${r.gapGbp ? 'text-stone-500' : 'text-fish'}`}>
                  {r.gapGbp == null ? '—' : r.gapGbp === 0 ? 'cheapest' : `+${gbp(r.gapGbp)} (${r.gapPct}%)`}
                </td>
                <td className="px-4 py-3 text-stone-400">{r.localeShown || '—'}</td>
                <td className="px-4 py-3 text-stone-400 max-w-xs">{r.notes || r.product}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={downloadCsv}
        className="rounded-md border border-stone-800 px-3 py-1.5 text-xs text-stone-400 transition hover:border-stone-600 hover:text-fish"
      >
        Download CSV
      </button>
    </section>
  );
}
