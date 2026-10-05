export const runtime = "nodejs";
export const maxDuration = 800;

import { BrowserProfile, RunStatus, TinyFish, type ProxyCountryCode } from "@tiny-fish/sdk";
import { getAirport, isAirportCode } from "@/lib/airports";
import { getEnv } from "@/lib/env";
import { getGbpRates } from "@/lib/fx";
import { DEFAULT_MARKETS, isMarketCode } from "@/lib/markets";
import { toPriceRow, type AgentPriceResult } from "@/lib/normalize";
import { DEFAULT_SITES, getSite, isSiteId, type FlightSite } from "@/lib/sites";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 780_000;

// ---------------------------------------------------------------------------
// Goal prompt
// ---------------------------------------------------------------------------

const buildGoal = (origin: string, destination: string, date: string) => `You are checking what price a visitor from THIS country is shown for a flight.

Flight to price: one-way, 1 adult, economy, ${origin} to ${destination}, departing ${date}.

Steps:
1. Wait for the page to fully render. Flight results load with JavaScript, so wait 5-10 seconds.
2. Dismiss cookie banners, newsletter popups and login modals.
3. IMPORTANT: do NOT change the site's country, region, language or currency settings.
   We want exactly the price this location sees by default.
4. If the page shows an error or a homepage instead of results, use the site's own
   search form: one-way, 1 adult, economy, ${origin} to ${destination}, departing ${date}.
5. Sort by "cheapest" if a sort control exists, then take the cheapest fare shown.

Return JSON:
{
  "site_name": "Name of the website",
  "product_description": "Short description of the fare (e.g. 'LHR-JFK 12 Nov, economy, BA 117')",
  "price": 123.45,                      // number only, no symbols
  "currency": "GBP",                    // ISO 4217 code of the currency shown
  "price_text": "£123.45",              // exactly as displayed
  "locale_shown": "e.g. 'UK / English / GBP' — the site region the page displayed",
  "notes": "Anything that affects comparability (basic economy, taxes excluded, etc.)"
}
If no price can be found, return the same JSON with "price": null and explain why in "notes".`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompareBody = {
  origin: string;
  destination: string;
  date: string;
  markets?: string[];
  sites?: string[];
};

interface Route {
  origin: string;
  destination: string;
  date: string;
}

interface Job {
  key: string; // `${site.id}:${market}`
  site: FlightSite;
  market: ProxyCountryCode;
}

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

const routeLabel = (code: string) => {
  const airport = getAirport(code);
  return airport ? `${code} (${airport.city})` : code;
};

// ---------------------------------------------------------------------------
// TinyFish agent per site × market — same route, different site + proxy country
// ---------------------------------------------------------------------------

async function runAgentForJob(
  client: TinyFish,
  job: Job,
  route: Route,
  goal: string,
  rates: Record<string, number>,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  const url = job.site.buildUrl(route.origin, route.destination, route.date);
  console.log(`[GEO] Starting ${job.key}: ${url}`);
  enqueue({ type: "MARKET_STARTED", key: job.key, market: job.market, site: job.site.id });

  try {
    const stream = await client.agent.stream({
      url,
      goal,
      browser_profile: BrowserProfile.STEALTH,
      proxy_config: { enabled: true, country_code: job.market },
    });

    let resultJson: AgentPriceResult | undefined;

    for await (const event of stream) {
      if (event.type === "STREAMING_URL") {
        enqueue({
          type: "STREAMING_URL",
          key: job.key,
          market: job.market,
          site: job.site.id,
          streamingUrl: event.streaming_url,
        });
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

    const row = toPriceRow(job.market, resultJson, rates, job.site.name, job.key);
    enqueue({
      type: "PRICE_RESULT",
      key: job.key,
      market: job.market,
      site: job.site.id,
      row,
      elapsed: `${elapsedSeconds(startedAt)}s`,
    });
    console.log(`[GEO] Complete ${job.key}: ${row.priceText} (${elapsedSeconds(startedAt)}s)`);
    return row.price != null;
  } catch (error) {
    console.error(`[GEO] Failed ${job.key}`, error);
    enqueue({
      type: "MARKET_FAILED",
      key: job.key,
      market: job.market,
      site: job.site.id,
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

  const origin = typeof body.origin === "string" ? body.origin.trim().toUpperCase() : "";
  const destination =
    typeof body.destination === "string" ? body.destination.trim().toUpperCase() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";

  if (!isAirportCode(origin) || !isAirportCode(destination)) {
    return Response.json(
      { error: "Valid 3-letter origin and destination airport codes are required" },
      { status: 400 },
    );
  }
  if (origin === destination) {
    return Response.json({ error: "Origin and destination must be different" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "A departure date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const markets = (body.markets?.length ? body.markets : DEFAULT_MARKETS).filter(isMarketCode);
  if (!markets.length) {
    return Response.json({ error: "Pick at least one country" }, { status: 400 });
  }

  const sites = (body.sites?.length ? body.sites : DEFAULT_SITES)
    .filter(isSiteId)
    .map((id) => getSite(id) as FlightSite);
  if (!sites.length) {
    return Response.json({ error: "Pick at least one flight site" }, { status: 400 });
  }

  let env;
  try {
    env = getEnv();
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }

  const client = new TinyFish({ apiKey: env.TINYFISH_API_KEY, timeout: REQUEST_TIMEOUT_MS });
  const compareStartedAt = Date.now();

  const route: Route = { origin, destination, date };
  const goal = buildGoal(routeLabel(origin), routeLabel(destination), date);
  const jobs: Job[] = sites.flatMap((site) =>
    markets.map((market) => ({ key: `${site.id}:${market}`, site, market })),
  );

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

      // 2. One browser agent per site × country, capped at the plan's concurrency
      const tasks = jobs.map(
        (job) => () => runAgentForJob(client, job, route, goal, rates, enqueue),
      );
      const settled = await runWithLimit(tasks, env.TINYFISH_CONCURRENCY);
      const succeeded = settled.filter((r) => r.status === "fulfilled" && r.value).length;

      enqueue({
        type: "COMPARE_COMPLETE",
        total: jobs.length,
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
