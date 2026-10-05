import type { ProxyCountryCode } from "@tiny-fish/sdk";

// Every country TinyFish can route a browser agent through (proxy_config.country_code).
// The same URL is opened once per market, so any price difference comes from
// where the visitor appears to be, not from what they searched for.
export interface Market {
  code: ProxyCountryCode;
  name: string;
  flag: string;
}

export const MARKETS: Market[] = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
];

export const DEFAULT_MARKETS: ProxyCountryCode[] = ["GB", "US", "DE", "JP"];

export function isMarketCode(value: unknown): value is ProxyCountryCode {
  return MARKETS.some((m) => m.code === value);
}

export function getMarket(code: string): Market | undefined {
  return MARKETS.find((m) => m.code === code);
}
