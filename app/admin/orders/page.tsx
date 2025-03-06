'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminOrders from '@/components/AdminOrders';
import { Loader2, ChevronDown } from 'lucide-react';
import type { Order } from '@/types/orders';
import { useAuth } from '@/contexts/AuthContext';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const { isAdmin } = useAuth();

    const pageSize = 13; // Počet objednávek na stránku

    const fetchOrders = useCallback(async (page: number = 0, search: string = '', replace: boolean = true) => {
        try {
            if (page === 0) {
                setLoading(true);
            } else {
                setIsLoadingMore(true);
            }
            console.log(`Načítání objednávek pro admina: stránka=${page}, hledání=${search}`);

            // Přidáme timestamp pro zabránění cachování
            const timestamp = Date.now();
            const params = new URLSearchParams({
                t: timestamp.toString(),
                page: page.toString(),
                pageSize: pageSize.toString()
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

            const data = await response.json();
            console.log(`Načteno ${data.orders.length} objednávek ze stránky ${page}`);

            // Aktualizujeme stav hasMore podle informací z API
            setHasMore(data.pagination.hasMore);

            // Aktualizujeme objednávky - buď nahrazujeme všechny, nebo přidáváme k existujícím
            if (replace) {
                setOrders(data.orders || []);
            } else {
                setOrders(prev => [...prev, ...(data.orders || [])]);
            }

            // Aktualizujeme aktuální stránku
            setCurrentPage(page);
        } catch (error) {
            console.error('Chyba při načítání objednávek:', error);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        await fetchOrders(currentPage + 1, searchQuery, false);
    }, [currentPage, fetchOrders, hasMore, isLoadingMore, searchQuery]);

    // Použití useCallback pro stabilizaci funkce handleSearch
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        fetchOrders(0, query);
    }, [fetchOrders]);

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

    // Načtení objednávek při prvním renderu
    useEffect(() => {
        if (isAdmin) {
            fetchOrders(0, '');
        }
    }, [isAdmin, fetchOrders]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <AdminOrders
                orders={orders}
                onOrdersChange={() => fetchOrders(0, '')}
                onExportOrders={handleExportOrders}
                onSearch={handleSearch}
            />

            {/* Tlačítko "Načíst další" */}
            {hasMore && (
                <div className="mt-6 text-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                  disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center mx-auto"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Načítám...
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                Načíst další objednávky
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
