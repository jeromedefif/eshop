'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Package, ShoppingCart, ArrowLeft, Home, ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useContext } from 'react';
import { CartContext } from '../page';

// Konstanty - velmi minimální změna
const PAGE_SIZE = 5;

const MyOrdersPage = () => {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const cartContext = useContext(CartContext);

    // Minimální nové proměnné pro paginaci
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreOrders, setHasMoreOrders] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Zachováváme stejnou strukturu s kontrolou cartContext
    if (!cartContext) {
        return null;
    }

    const { setCartItems } = cartContext;

    // Upravený useEffect - podobný původnímu
    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        const fetchOrders = async () => {
            try {
                // Načítáme první stránku stejně jako v původním kódu
                const { data, error, count } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            id,
                            product_id,
                            volume,
                            quantity,
                            product:products (
                                id,
                                name,
                                category,
                                in_stock
                            )
                        )
                    `, { count: 'exact' })
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .range(0, PAGE_SIZE - 1);

                if (error) {
                    throw error;
                }

                setOrders(data || []);

                // Zjistíme, zda existují další objednávky
                setHasMoreOrders((count || 0) > PAGE_SIZE);
                setCurrentPage(0);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user, router]);

    // Nová funkce pro načítání dalších objednávek
    const loadMoreOrders = async () => {
        if (!user || isLoadingMore) return;

        setIsLoadingMore(true);

        try {
            const nextPage = currentPage + 1;
            const startIndex = nextPage * PAGE_SIZE;
            const endIndex = startIndex + PAGE_SIZE - 1;

            const { data, error, count } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        id,
                        product_id,
                        volume,
                        quantity,
                        product:products (
                            id,
                            name,
                            category,
                            in_stock
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(startIndex, endIndex);

            if (error) {
                throw error;
            }

            // Přidáme nové objednávky k existujícím
            setOrders(prevOrders => [...prevOrders, ...(data || [])]);

            // Aktualizujeme stránku a zkontrolujeme, zda existují další objednávky
            setCurrentPage(nextPage);
            setHasMoreOrders((count || 0) > (nextPage + 1) * PAGE_SIZE);
        } catch (error) {
            console.error('Error loading more orders:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Zde zachováváme původní handleReorder beze změny
    const handleReorder = async (order: any) => {
        // Kontrola dostupnosti položek
        const unavailableItems = order.order_items.filter((item: any) => !item.product.in_stock);

        if (unavailableItems.length > 0) {
            // Upozornění na nedostupné položky
            const itemNames = unavailableItems.map((item: any) => item.product.name).join(', ');
            alert(`Následující položky již nejsou skladem: ${itemNames}`);

            // Do košíku přidáme pouze dostupné položky
            const newCartItems: {[key: string]: number} = {};
            order.order_items.forEach((item: any) => {
                if (item.product.in_stock) {
                    const key = `${item.product_id}-${item.volume}`;
                    newCartItems[key] = item.quantity;
                }
            });

            setCartItems(newCartItems);
        } else {
            // Všechny položky jsou dostupné
            const newCartItems: {[key: string]: number} = {};
            order.order_items.forEach((item: any) => {
                const key = `${item.product_id}-${item.volume}`;
                newCartItems[key] = item.quantity;
            });
            setCartItems(newCartItems);
        }

        // Přesměrování na souhrn objednávky
        router.push('/order-summary');
    };

    // Zachování původní funkce formátování data
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Zachování původní funkce getStatusLabel
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Čeká na zpracování</span>;
            case 'confirmed':
                return <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Potvrzeno</span>;
            case 'completed':
                return <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Dokončeno</span>;
            case 'cancelled':
                return <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Zrušeno</span>;
            default:
                return <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white shadow-sm mb-6">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center">
                                <h1 className="text-xl font-bold text-gray-900">Moje objednávky</h1>
                            </div>
                            <div className="flex items-center">
                                <Link
                                    href="/"
                                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    <Home className="w-5 h-5 mr-1" />
                                    Zpět na katalog
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg text-gray-500">Zatím nemáte žádné objednávky</p>
                        <Link
                            href="/"
                            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Přejít do katalogu
                        </Link>
                    </div>
                ) : (
                    <div>
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
                                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center space-x-3">
                                                <span className="font-semibold text-gray-900">Objednávka #{order.id.substring(0, 8)}</span>
                                                {getStatusLabel(order.status)}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {formatDate(order.created_at)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleReorder(order)}
                                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Objednat znovu
                                        </button>
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-medium text-gray-900 mb-2">Položky objednávky:</h3>
                                        <ul className="space-y-2">
                                            {order.order_items.map((item: any) => (
                                                <li key={item.id} className="flex justify-between items-center">
                                                    <div className="text-gray-800">
                                                        {item.product.name} - {item.volume === 'maly'
                                                            ? 'malý'
                                                            : item.volume === 'velky'
                                                                ? 'velký'
                                                                : `${item.volume}L`} x {item.quantity}
                                                    </div>
                                                    {!item.product.in_stock && (
                                                        <span className="text-red-600 text-sm">Není skladem</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                                            <span className="font-medium text-gray-700">Celkový objem:</span>
                                            <span className="font-bold text-blue-600">{order.total_volume}L</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tlačítko pro načtení dalších objednávek - jediný nový prvek v UI */}
                        {hasMoreOrders && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={loadMoreOrders}
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
                )}
            </div>
        </div>
    );
};

export default MyOrdersPage;
