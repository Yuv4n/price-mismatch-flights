export const runtime = "nodejs";
export const maxDuration = 800;

import { BrowserProfile, RunStatus, TinyFish, type ProxyCountryCode } from "@tiny-fish/sdk";
import { getEnv } from "@/lib/env";
import { getGbpRates } from "@/lib/fx";
import { DEFAULT_MARKETS, isMarketCode } from "@/lib/markets";
import { toPriceRow, type AgentPriceResult } from "@/lib/normalize";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 780_000;

// ---------------------------------------------------------------------------
// Goal prompt
// ---------------------------------------------------------------------------

const buildGoal = (target: string) => `You are checking what price a visitor from THIS country is shown for a travel product (flight, hotel, activity or rental).

What to price: ${target}

Steps:
1. Wait for the page to fully render. Travel sites load prices with JavaScript, so wait 3-5 seconds.
2. Dismiss cookie banners, newsletter popups and login modals.
3. IMPORTANT: do NOT change the site's country, region, language or currency settings.
   We want exactly the price this location sees by default.
4. If prices only appear after pressing a search/submit button, press it with the values already filled in.
5. Find the price for the item described above. If several options are shown, take the
   cheapest option that matches the description.

Return JSON:
{
  "site_name": "Name of the website",
  "product_description": "Short description of what was priced (e.g. 'LHR-JFK 12 Nov, economy, BA 117')",
  "price": 123.45,                      // number only, no symbols
  "currency": "GBP",                    // ISO 4217 code of the currency shown
  "price_text": "£123.45",              // exactly as displayed
  "locale_shown": "e.g. 'UK / English / GBP' — the site region the page displayed",
  "notes": "Anything that affects comparability (taxes excluded, per night, member price, etc.)"
}
If no price can be found, return the same JSON with "price": null and explain why in "notes".`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompareBody = { url: string; target: string; markets?: string[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

/** Run async jobs with at most `limit` in flight (TinyFish plans cap concurrent agents). */
async function runWithLimit<T>(jobs: (() => Promise<T>)[], limit: number) {
  const results: PromiseSettledResult<T>[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await jobs[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// TinyFish agent per market — same URL, different proxy country
// ---------------------------------------------------------------------------

async function runAgentForMarket(
  client: TinyFish,
  url: string,
  target: string,
  market: ProxyCountryCode,
  rates: Record<string, number>,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[GEO] Starting ${market}: ${url}`);
  enqueue({ type: "MARKET_STARTED", market });

  try {
    const stream = await client.agent.stream({
      url,
      goal: buildGoal(target),
      browser_profile: BrowserProfile.STEALTH,
      proxy_config: { enabled: true, country_code: market },
    });

    let resultJson: AgentPriceResult | undefined;

    for await (const event of stream) {
      if (event.type === "STREAMING_URL") {
        enqueue({ type: "STREAMING_URL", market, streamingUrl: event.streaming_url });
        continue;
      }

      if (event.type === "COMPLETE") {
        if (event.status === RunStatus.COMPLETED && event.result) {
          // COMPLETED only means the browser ran without crashing
          // — always validate result content, not just the status
          resultJson = event.result as AgentPriceResult;
        }
        break;
      }
    }

    if (!resultJson) throw new Error("Stream finished without COMPLETED result");

    const row = toPriceRow(market, resultJson, rates);
    enqueue({ type: "PRICE_RESULT", market, row, elapsed: `${elapsedSeconds(startedAt)}s` });
    console.log(`[GEO] Complete ${market}: ${row.priceText} (${elapsedSeconds(startedAt)}s)`);
    return row.price != null;
  } catch (error) {
    console.error(`[GEO] Failed ${market}`, error);
    enqueue({
      type: "MARKET_FAILED",
      market,
      error: error instanceof Error ? error.message : "Agent run failed",
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: CompareBody;

  try {
    body = (await request.json()) as CompareBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(body.url);
  } catch {
    return Response.json({ error: "A valid booking URL is required" }, { status: 400 });
  }

  const target = body.target?.trim() || "the main price shown on the page";
  const markets = (body.markets?.length ? body.markets : DEFAULT_MARKETS).filter(isMarketCode);
  if (!markets.length) {
    return Response.json({ error: "Pick at least one market" }, { status: 400 });
  }

  let env;
  try {
    env = getEnv();
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }

  const client = new TinyFish({ apiKey: env.TINYFISH_API_KEY, timeout: REQUEST_TIMEOUT_MS });
  const compareStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(sseData(payload)));

      // 1. Live FX rates via TinyFish Fetch
      let rates: Record<string, number> = { GBP: 1 };
      try {
        rates = await getGbpRates(client);
        enqueue({ type: "FX_RATES", base: "GBP", rates });
      } catch (error) {
        console.error("[GEO] FX failed", error);
        enqueue({ type: "FX_FAILED" });
      }

      // 2. One browser agent per market, capped at the plan's concurrency
      const jobs = markets.map(
        (market) => () =>
          runAgentForMarket(client, url.toString(), target, market, rates, enqueue),
      );
      const settled = await runWithLimit(jobs, env.TINYFISH_CONCURRENCY);
      const succeeded = settled.filter((r) => r.status === "fulfilled" && r.value).length;

      enqueue({
        type: "COMPARE_COMPLETE",
        total: markets.length,
        succeeded,
        elapsed: `${elapsedSeconds(compareStartedAt)}s`,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
