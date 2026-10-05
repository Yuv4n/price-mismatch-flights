// Turns raw agent output into a comparable row, and ranks rows by GBP price.

export interface AgentPriceResult {
  site_name?: string | null;
  product_description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  price_text?: string | null;
  locale_shown?: string | null;
  notes?: string | null;
}

export interface PriceRow {
  market: string;
  siteName: string;
  product: string;
  price: number | null;
  currency: string | null;
  priceText: string;
  localeShown: string;
  notes: string;
  priceGbp: number | null;
}

export interface RankedRow extends PriceRow {
  rank: number | null;
  gapGbp: number | null;
  gapPct: number | null;
  isCheapest: boolean;
}

/**
 * Parse a price that may arrive as a number or a localised string,
 * e.g. "£1,234.50", "1.234,50 €", "¥ 182,000", "US$ 899".
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;

  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalised: string;

  if (lastDot === -1 && lastComma === -1) {
    normalised = cleaned;
  } else if (lastComma > lastDot) {
    // Comma is the last separator: decimal if followed by 1-2 digits, else thousands.
    const tail = cleaned.slice(lastComma + 1);
    normalised =
      tail.length <= 2
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else {
    const tail = cleaned.slice(lastDot + 1);
    normalised =
      tail.length <= 2 && lastDot !== -1
        ? cleaned.replace(/,/g, "")
        : cleaned.replace(/[.,]/g, "");
  }

  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const SYMBOL_TO_ISO: Record<string, string> = {
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
  "A$": "AUD",
  "C$": "CAD",
  "CA$": "CAD",
  "US$": "USD",
  $: "USD",
};

export function normaliseCurrency(raw: unknown, priceText = ""): string | null {
  if (typeof raw === "string" && /^[A-Za-z]{3}$/.test(raw.trim())) {
    return raw.trim().toUpperCase();
  }
  const haystack = `${typeof raw === "string" ? raw : ""} ${priceText}`;
  const iso = haystack.match(/\b(GBP|EUR|USD|JPY|AUD|CAD|CHF)\b/i);
  if (iso) return iso[1].toUpperCase();
  for (const [symbol, code] of Object.entries(SYMBOL_TO_ISO)) {
    if (haystack.includes(symbol)) return code;
  }
  return null;
}

/** rates = units of currency per 1 GBP */
export function toGbp(
  price: number | null,
  currency: string | null,
  rates: Record<string, number>,
): number | null {
  if (price == null || !currency) return null;
  if (currency === "GBP") return round2(price);
  const rate = rates[currency];
  if (!rate) return null;
  return round2(price / rate);
}

export function toPriceRow(
  market: string,
  raw: AgentPriceResult,
  rates: Record<string, number>,
): PriceRow {
  const priceText = String(raw.price_text ?? raw.price ?? "");
  const price = parsePrice(raw.price) ?? parsePrice(raw.price_text);
  const currency = normaliseCurrency(raw.currency, priceText);
  return {
    market,
    siteName: raw.site_name ?? "Unknown site",
    product: raw.product_description ?? "",
    price,
    currency,
    priceText,
    localeShown: raw.locale_shown ?? "",
    notes: raw.notes ?? "",
    priceGbp: toGbp(price, currency, rates),
  };
}

export function rankRows(rows: PriceRow[]): RankedRow[] {
  const priced = rows
    .filter((r) => r.priceGbp != null)
    .sort((a, b) => (a.priceGbp as number) - (b.priceGbp as number));
  const cheapest = priced[0]?.priceGbp ?? null;

  return rows
    .map((row) => {
      const idx = priced.indexOf(row);
      const gapGbp =
        cheapest != null && row.priceGbp != null ? round2(row.priceGbp - cheapest) : null;
      return {
        ...row,
        rank: idx === -1 ? null : idx + 1,
        gapGbp,
        gapPct:
          gapGbp != null && cheapest ? Math.round((gapGbp / cheapest) * 1000) / 10 : null,
        isCheapest: idx === 0,
      };
    })
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
