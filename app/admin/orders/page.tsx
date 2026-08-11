'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminOrders from '@/components/AdminOrders';
import { Loader2 } from 'lucide-react';
import type { Order } from '@/types/orders';
import { useAuth } from '@/contexts/AuthContext';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPeriod, setCurrentPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
    const { isAdmin } = useAuth();
    const isFetchingRef = useRef(false);

    // Funkce pro načtení všech objednávek s podporou období
    const fetchOrders = useCallback(async (search: string = '', period: 'week' | 'month' | 'year' | 'all' = 'month') => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        try {
            setLoading(true);
            console.log(`Načítání objednávek pro admina${search ? ' s vyhledáváním: ' + search : ''}, období: ${period}`);

            // Přidáme timestamp pro zabránění cachování
            const timestamp = Date.now();

            // Sestavení URL s parametry
            const params = new URLSearchParams({
                t: timestamp.toString(),
                period: period // Přidáme parametr období
            });

            // Přidáme parametr search, pokud existuje
            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`/api/orders?${params.toString()}`, {
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

            const data: Order[] = await response.json();
            console.log(`Načteno ${data.length} objednávek pro období: ${period}`);

            // Interní poznámky se načítají jedním zabezpečeným admin požadavkem,
            // nikoliv samostatně pro každou objednávku.
            let notesByOrderId = new Map<string, NonNullable<Order['internal_note']>>();
            if (data.length > 0) {
                try {
                    const notesResponse = await fetch('/api/orders/internal-notes', {
                        method: 'POST',
                        cache: 'no-store',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache, no-store, must-revalidate'
                        },
                        body: JSON.stringify({ orderIds: data.map((order) => order.id) })
                    });

                    if (notesResponse.ok) {
                        const notesData = await notesResponse.json();
                        notesByOrderId = new Map(
                            (notesData.notes || []).map((note: { order_id: string; note: string; updated_at: string | null }) => [
                                note.order_id,
                                { note: note.note, updated_at: note.updated_at }
                            ])
                        );
                    } else {
                        console.error('Nepodařilo se načíst interní poznámky:', notesResponse.status);
                    }
                } catch (notesError) {
                    // Seznam objednávek zůstane použitelný i při dočasném problému poznámek.
                    console.error('Chyba při načítání interních poznámek:', notesError);
                }
            }

            setOrders(data.map((order) => ({
                ...order,
                internal_note: notesByOrderId.get(order.id) || null
            })));
        } catch (error) {
            console.error('Chyba při načítání objednávek:', error);
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, []);

    // Použití useCallback pro stabilizaci funkce handleSearch
    const handleSearch = useCallback((query: string) => {
        return fetchOrders(query, 'month'); // Při vyhledávání zachováme aktuální období
    }, [fetchOrders]);

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
            fetchOrders('', currentPeriod);
        }
    }, [isAdmin, fetchOrders, currentPeriod]);

    // Automatický refresh každých 60s pouze při aktivní záložce
    useEffect(() => {
        if (!isAdmin) return;

        const refreshIfVisible = () => {
            if (document.visibilityState !== 'visible') return;
            fetchOrders('', currentPeriod);
        };

        const intervalId = window.setInterval(refreshIfVisible, 60000);
        document.addEventListener('visibilitychange', refreshIfVisible);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', refreshIfVisible);
        };
    }, [isAdmin, fetchOrders, currentPeriod]);

    if (loading && orders.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full">
            <AdminOrders
                orders={orders}
                onOrdersChange={(period?: 'week' | 'month' | 'year' | 'all') => {
                    const nextPeriod = period || 'month';
                    setCurrentPeriod(nextPeriod);
                    return fetchOrders('', nextPeriod);
                }}
                onExportOrders={handleExportOrders}
                onSearch={handleSearch}
            />
        </div>
    );
}
