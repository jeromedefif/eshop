'use client';
import { useEffect, useState } from 'react';
import { pragueDayKey } from '@/lib/catalog/top10-period';
export type DailyTop10 = { productIds: string[]; day: string; nextRefreshAt: string };
export function useDailyTop10(enabled: boolean) {
  const [data, setData] = useState<DailyTop10 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout>;
    let savedDay = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError(''); setData(null);
    const load = async () => {
      try {
        const response = await fetch('/api/catalog/top10', { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.productIds) || !result.productIds.every((id: unknown) => typeof id === 'string') || result.productIds.length > 10 || result.day !== pragueDayKey() || !Number.isFinite(Date.parse(result.nextRefreshAt))) throw new Error();
        if (!active) return;
        savedDay = result.day;
        setData(result);
        refreshTimer = setTimeout(() => setRetry(n => n + 1), Math.max(1000, Date.parse(result.nextRefreshAt) - Date.now()));
      } catch {
        if (active) setError('Žebříček se nyní nepodařilo načíst. Katalog můžete používat dál.');
      } finally { clearTimeout(timeout); if (active) setLoading(false); }
    };
    // Refresh a tab reopened after midnight, including tabs suspended by the browser.
    const onVisible = () => { if (document.visibilityState === 'visible' && savedDay && savedDay !== pragueDayKey()) setRetry(n => n + 1); };
    document.addEventListener('visibilitychange', onVisible);
    void load();
    return () => { active = false; controller.abort(); clearTimeout(timeout); clearTimeout(refreshTimer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, retry]);
  return { data, loading, error, retry: () => setRetry(n => n + 1) };
}
