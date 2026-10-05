import { describe, expect, it } from "vitest";
import { normaliseCurrency, parsePrice, rankRows, toGbp, toPriceRow } from "@/lib/normalize";
import { extractRates } from "@/lib/fx";

const RATES = { GBP: 1, USD: 1.25, EUR: 1.2, JPY: 200 };

describe("parsePrice", () => {
  it.each([
    [123.45, 123.45],
    ["£1,234.50", 1234.5],
    ["1.234,50 €", 1234.5],
    ["¥ 182,000", 182000],
    ["US$ 899", 899],
    ["", null],
    [null, null],
  ])("parses %s", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
});

describe("normaliseCurrency", () => {
  it("accepts ISO codes and symbols", () => {
    expect(normaliseCurrency("eur")).toBe("EUR");
    expect(normaliseCurrency(null, "£99")).toBe("GBP");
    expect(normaliseCurrency(undefined, "¥18,000")).toBe("JPY");
  });
});

describe("toGbp", () => {
  it("converts using units-per-GBP rates", () => {
    expect(toGbp(125, "USD", RATES)).toBe(100);
    expect(toGbp(20000, "JPY", RATES)).toBe(100);
    expect(toGbp(50, "XYZ", RATES)).toBeNull();
  });
});

describe("rankRows", () => {
  it("ranks by GBP and computes the gap to the cheapest market", () => {
    const rows = [
      toPriceRow("US", { price: 150, currency: "USD" }, RATES),
      toPriceRow("GB", { price: 100, currency: "GBP" }, RATES),
      toPriceRow("JP", { price: null, notes: "blocked" }, RATES),
    ];
    const ranked = rankRows(rows);
    expect(ranked[0].market).toBe("GB");
    expect(ranked[0].isCheapest).toBe(true);
    expect(ranked[1].gapGbp).toBe(20);
    expect(ranked[1].gapPct).toBe(20);
    expect(ranked[2].rank).toBeNull();
  });
});

describe("extractRates", () => {
  it("reads rates out of fetched JSON text", () => {
    const text = 'Some header\n{"result":"success","base_code":"GBP","rates":{"GBP":1,"USD":1.27}}';
    expect(extractRates(text)?.USD).toBe(1.27);
  });
});
