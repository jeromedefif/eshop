'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import EmailDeliveryIssues from '@/components/EmailDeliveryIssues';
import AdminOrders from '@/components/AdminOrders';
import type { Order, OrdersApiResponse } from '@/types/orders';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState<OrdersApiResponse['pagination'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPeriod, setCurrentPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
    const { isAdmin } = useAuth();
    const [loadError, setLoadError] = useState<string | null>(null);
    const activeRequest = useRef<{ controller: AbortController; period: string } | null>(null);

    // Funkce pro načtení všech objednávek s podporou období
    const fetchOrders = useCallback(async (period: 'week' | 'month' | 'year' | 'all') => {
        const requestKey = `${period}:${page}:${search}`;
        if (activeRequest.current?.period === requestKey) return;
        activeRequest.current?.controller.abort();
        const controller = new AbortController();
        activeRequest.current = { controller, period: requestKey };
        try {
            setLoading(true);
            setLoadError(null);

            // Přidáme timestamp pro zabránění cachování
            const timestamp = Date.now();

            // Sestavení URL s parametry
            const params = new URLSearchParams({
                t: timestamp.toString(),
                period, page: String(page), search
            });

            const response = await fetchWithRetry(`/api/orders?${params.toString()}`, {
                signal: controller.signal,
                // Explicitně nastavíme hlavičky pro zabránění cachování
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: OrdersApiResponse = await response.json();
            if (controller.signal.aborted) return;
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (error) {
            if (controller.signal.aborted) return;
            console.error('Chyba při načítání objednávek:', error);
            setLoadError('Objednávky se nepodařilo obnovit. Zobrazené údaje nemusí být aktuální. Zkuste Obnovit znovu.');
        } finally {
            if (activeRequest.current?.controller === controller) {
                activeRequest.current = null;
                setLoading(false);
            }
        }
    }, [page, search]);

    // Export objednávek do CSV
    const handleExportOrders = useCallback(async () => {
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/orders/export?t=${timestamp}`, {
                cache: 'no-store'
            });

            if (!response.ok) throw new Error('Export selhal');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Chyba při exportu:', error);
        }
    }, []);

    // Načtení objednávek při prvním renderu - s výchozím obdobím "month"
    useEffect(() => {
        if (isAdmin) {
            fetchOrders(currentPeriod);
        }
    }, [isAdmin, fetchOrders, currentPeriod]);

    // Automatický refresh každých 60s pouze při aktivní záložce
    useEffect(() => {
        if (!isAdmin) return;

        const refreshIfVisible = () => {
            if (document.visibilityState !== 'visible') return;
            fetchOrders(currentPeriod);
        };

        const intervalId = window.setInterval(refreshIfVisible, 60000);
        document.addEventListener('visibilitychange', refreshIfVisible);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', refreshIfVisible);
        };
    }, [isAdmin, fetchOrders, currentPeriod]);

    useEffect(() => () => activeRequest.current?.controller.abort(), []);

    return (
        <div className="w-full">
            <EmailDeliveryIssues />
            {loading && <p role="status" className="mb-3 text-sm text-slate-600">Načítání objednávek…</p>}
            {loadError && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{loadError}</p>}
            <AdminOrders
                orders={orders}
                onOrdersChange={(period?: 'week' | 'month' | 'year' | 'all') => {
                    const nextPeriod = period ?? currentPeriod;
                    if (nextPeriod !== currentPeriod) {
                        setPage(1);
                        setCurrentPeriod(nextPeriod);
                        return Promise.resolve();
                    }
                    return fetchOrders(currentPeriod);
                }}
                onSearch={(query) => { setPage(1); setSearch(query); }}
                onExportOrders={handleExportOrders}
            />
            {pagination && <nav aria-label="Stránkování objednávek" className="mt-4 flex items-center justify-between gap-3">
                <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="rounded border px-4 py-2 disabled:opacity-40">Předchozí</button>
                <span>Strana {page} · celkem {pagination.totalOrders} objednávek</span>
                <button disabled={!pagination.hasMore || loading} onClick={() => setPage(page + 1)} className="rounded border px-4 py-2 disabled:opacity-40">Další</button>
            </nav>}
        </div>
    );
}
