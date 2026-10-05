'use client';

import { useCallback, useRef, useState } from 'react';
import type { PriceRow } from '@/lib/normalize';

export type MarketStatus = 'queued' | 'running' | 'done' | 'failed';

export interface StreamingPreview {
  key: string;
  market: string;
  site: string;
  streamingUrl: string;
  done: boolean;
}

export interface CompareRequest {
  origin: string;
  destination: string;
  date: string;
  markets: string[];
  sites: string[];
}

export function usePriceCompare() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [previews, setPreviews] = useState<StreamingPreview[]>([]);
  const [status, setStatus] = useState<Record<string, MarketStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState<string | null>(null);
  const [fxLoaded, setFxLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: Record<string, unknown>) => {
    const key = event.key as string | undefined;
    switch (event.type) {
      case 'FX_RATES':
        setFxLoaded(true);
        break;
      case 'MARKET_STARTED':
        if (key) setStatus((s) => ({ ...s, [key]: 'running' }));
        break;
      case 'STREAMING_URL':
        if (key)
          setPreviews((p) => [
            ...p.filter((x) => x.key !== key),
            {
              key,
              market: (event.market as string) ?? '',
              site: (event.site as string) ?? '',
              streamingUrl: event.streamingUrl as string,
              done: false,
            },
          ]);
        break;
      case 'PRICE_RESULT':
        if (key) {
          setRows((r) => [...r.filter((x) => x.jobKey !== key), event.row as PriceRow]);
          setStatus((s) => ({ ...s, [key]: 'done' }));
          setPreviews((p) => p.map((x) => (x.key === key ? { ...x, done: true } : x)));
        }
        break;
      case 'MARKET_FAILED':
        if (key) {
          setStatus((s) => ({ ...s, [key]: 'failed' }));
          setErrors((e) => ({ ...e, [key]: event.error as string }));
          setPreviews((p) => p.map((x) => (x.key === key ? { ...x, done: true } : x)));
        }
        break;
      case 'COMPARE_COMPLETE':
        setElapsed(event.elapsed as string);
        break;
    }
  }, []);

  const run = useCallback(
    async (req: CompareRequest) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setRows([]);
      setPreviews([]);
      setErrors({});
      setElapsed(null);
      setFxLoaded(false);
      setError(null);
      setStatus(
        Object.fromEntries(
          req.sites.flatMap((site) =>
            req.markets.map((market) => [`${site}:${market}`, 'queued' as MarketStatus]),
          ),
        ),
      );
      setIsRunning(true);

      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';
          for (const chunk of chunks) {
            const line = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              handleEvent(JSON.parse(line.slice(6)));
            } catch {
              // ignore malformed chunk
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message);
      } finally {
        setIsRunning(false);
      }
    },
    [handleEvent],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { rows, previews, status, errors, isRunning, elapsed, fxLoaded, error, run, cancel };
}
