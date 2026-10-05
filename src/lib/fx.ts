import type { TinyFish } from "@tiny-fish/sdk";

// Exchange rates are read with TinyFish Fetch (the free page-reader endpoint),
// so every number in the table comes from the live web at search time.
const FX_URL = "https://open.er-api.com/v6/latest/GBP";

/** Returns units of each currency per 1 GBP, e.g. { USD: 1.27, EUR: 1.17, ... } */
export async function getGbpRates(client: TinyFish): Promise<Record<string, number>> {
  try {
    const res = await client.fetch.getContents({ urls: [FX_URL], format: "markdown" });
    const page = res.results?.[0];
    const text = page && "text" in page && typeof page.text === "string" ? page.text : "";
    const parsed = extractRates(text);
    if (parsed) return parsed;
  } catch (error) {
    console.warn("[FX] TinyFish Fetch failed, falling back to direct request", error);
  }

  const direct = await fetch(FX_URL, { cache: "no-store" });
  const json = (await direct.json()) as { rates?: Record<string, number> };
  if (!json.rates) throw new Error("FX source returned no rates");
  return json.rates;
}

export function extractRates(text: string): Record<string, number> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const json = JSON.parse(text.slice(start, end + 1)) as { rates?: Record<string, number> };
      if (json.rates && typeof json.rates.USD === "number") return json.rates;
    } catch {
      // fall through to regex scan
    }
  }

  const rates: Record<string, number> = {};
  for (const m of text.matchAll(/"?([A-Z]{3})"?\s*:\s*([\d.]+)/g)) {
    rates[m[1]] = Number.parseFloat(m[2]);
  }
  return typeof rates.USD === "number" ? rates : null;
}
