# Geo Fare Gap
**Live Demo:** _add URL after deploy_

**Same flight, same hotel, different country, different price. Geo Fare Gap opens one booking page from up to 7 countries at the same time and shows you which location is quoted the lowest price.**

Paste a link to a flight search, hotel results page or activity listing. The app starts one TinyFish browser agent per country (UK, US, Germany, France, Canada, Japan, Australia). Each agent is routed through that country's proxy with `proxy_config.country_code`, so the site sees a local visitor. The agent reads the price shown without touching the site's currency or region settings. TinyFish Fetch pulls live GBP exchange rates, and the app ranks every market by its GBP price and shows the gap to the cheapest.

## Demo

_add screenshot / gif here_

## TinyFish API usage

**Agent + country proxy** (`src/app/api/compare/route.ts`): the same URL is opened once per market.

```ts
const stream = await client.agent.stream({
  url,
  goal: buildGoal(target), // "find the price for <target>, do NOT change country/currency, return JSON"
  browser_profile: BrowserProfile.STEALTH,
  proxy_config: { enabled: true, country_code: market }, // "GB" | "US" | "DE" | "FR" | "CA" | "JP" | "AU"
});

for await (const event of stream) {
  if (event.type === "STREAMING_URL") enqueue({ type: "STREAMING_URL", market, streamingUrl: event.streaming_url });
  if (event.type === "COMPLETE") {
    if (event.status === RunStatus.COMPLETED && event.result) resultJson = event.result;
    break;
  }
}
```

**Fetch** (`src/lib/fx.ts`): live exchange rates so every price can be compared in GBP.

```ts
const res = await client.fetch.getContents({
  urls: ["https://open.er-api.com/v6/latest/GBP"],
  format: "markdown",
});
```

Each agent returns:

```json
{
  "site_name": "Google Flights",
  "product_description": "LHR-JFK 12 Nov, economy, nonstop",
  "price": 412,
  "currency": "USD",
  "price_text": "$412",
  "locale_shown": "US / English / USD",
  "notes": "Price per adult incl. taxes"
}
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Browser (Client)                       │
│  CompareForm (URL + what to price + countries)               │
│  PriceTable (ranked, GBP, gap vs cheapest, CSV export)       │
│  LivePreviewGrid (one live agent iframe per country)         │
└──────────────────────────────┬───────────────────────────────┘
                               │ POST /api/compare  (SSE)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                         TinyFish SDK                         │
│                                                              │
│  1. Fetch → open.er-api.com/v6/latest/GBP → FX_RATES         │
│                                                              │
│  2. Agent × N  (capped by TINYFISH_CONCURRENCY)              │
│       same URL ── proxy GB ──► price in GBP                  │
│       same URL ── proxy US ──► price in USD                  │
│       same URL ── proxy DE ──► price in EUR                  │
│       same URL ── proxy JP ──► price in JPY                  │
│     browser_profile: STEALTH                                 │
│     STREAMING_URL → live iframe per country                  │
│     COMPLETE + COMPLETED → validate JSON → PRICE_RESULT      │
│     // COMPLETED only means the browser ran without          │
│     // crashing, so the result content is always checked     │
│                                                              │
│  3. normalize.ts → parse price, ISO currency, convert to GBP │
│     → rank → COMPARE_COMPLETE                                │
└──────────────────────────────────────────────────────────────┘

No database. No cache. Every price is fetched live on each run.
```

## Setup

### Prerequisites

- Node.js 20+
- TinyFish API key

### Environment Variables

```bash
cp .env.example .env.local
```

```env
# TinyFish Web Agent API key (server-side only)
# Get yours at: https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=

# Optional: how many browser agents run at once (match your TinyFish plan)
TINYFISH_CONCURRENCY=2
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, pick one of the example links (flight, hotel, activity) or paste your own, choose countries and press **Compare**.

```bash
npm test   # price parsing, currency detection, GBP conversion, ranking
```

## Keep it running (TinyFish Monitor)

Point a TinyFish Monitor at the booking URL you care about and it re-checks the page on a schedule, so a price change gets flagged without anyone opening the app.

## Project Structure

```
geo-fare-gap/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       └── compare/route.ts      # POST: FX via Fetch, then one agent per country proxy (SSE)
│   ├── components/
│   │   ├── compare-form.tsx          # URL, target, country picker, example links
│   │   ├── price-table.tsx           # Ranked GBP table, cheapest banner, CSV export
│   │   └── live-preview-grid.tsx     # Live agent iframe per country
│   ├── hooks/
│   │   └── use-price-compare.ts      # SSE client
│   ├── lib/
│   │   ├── env.ts                    # Env validation
│   │   ├── fx.ts                     # GBP rates via TinyFish Fetch
│   │   ├── markets.ts                # Supported proxy countries
│   │   └── normalize.ts              # Price parsing, currency, GBP conversion, ranking
│   └── __tests__/                    # Vitest unit tests
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all prices fetched live) |
| Real geolocation? | YES (`proxy_config.country_code` per agent) |
| Stealth for protected sites? | YES (`BrowserProfile.STEALTH`) |
| Concurrency respected? | YES (`TINYFISH_CONCURRENCY` worker pool) |
| Live browser preview? | YES (`STREAMING_URL` → iframe per country) |
| Result validation? | YES (COMPLETED ≠ goal achieved, so content is validated) |
