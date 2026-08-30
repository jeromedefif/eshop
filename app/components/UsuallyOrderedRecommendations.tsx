'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/lib/analytics/client';
import { getAllowedVolumes, normalizeProductCategory } from '@/lib/product-config';
import type { Product } from '@/types/database';
import type { CartItems } from '@/contexts/CartContext';

const ORDER_LIMIT = 6;
const RECOMMENDATION_LIMIT = 4;
const VALID_ORDER_STATUSES = ['pending', 'confirmed', 'completed'];

type HistoricalOrder = {
    id: string;
    created_at: string;
    order_items: Array<{
        product_id: string | number;
        volume: string;
        quantity: number;
    }>;
};

type Recommendation = {
    product: Product;
    volume: string;
    orderCount: number;
    recentOrderCount: number;
    lastOrderedAt: string;
    totalQuantity: number;
    typicalQuantity: number;
};

type UsuallyOrderedRecommendationsProps = {
    userId: string;
    cartItems: CartItems;
    products: Product[];
    onAddToCart: (productId: string | number, volume: string | number) => void;
};

const getVolumeLabel = (product: Product, volume: string) => {
    const category = normalizeProductCategory(product.category);
    if (category === 'PET') return 'balení';
    if (category === 'Plyny') return volume === 'maly' ? 'malý' : 'velký';
    return `${volume}L`;
};

const getMedianQuantity = (quantities: number[]) => {
    const sorted = quantities.filter((quantity) => quantity > 0).sort((a, b) => a - b);
    if (sorted.length === 0) return 1;
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
    return Math.max(1, Math.round(median));
};

const createRecommendations = (orders: HistoricalOrder[], products: Product[]): Recommendation[] => {
    if (orders.length < 2) return [];

    const productsById = new Map(products.map((product) => [String(product.id), product]));
    const aggregates = new Map<string, {
        orderIds: Set<string>;
        lastOrderedAt: string;
        totalQuantity: number;
        volumes: Map<string, {
            totalQuantity: number;
            orderQuantities: Map<string, number>;
        }>;
    }>();

    orders.forEach((order) => {
        (order.order_items || []).forEach((item) => {
            const productId = String(item.product_id);
            const quantity = Number(item.quantity) || 0;
            const volume = String(item.volume);
            const current = aggregates.get(productId) || {
                orderIds: new Set<string>(),
                lastOrderedAt: order.created_at,
                totalQuantity: 0,
                volumes: new Map<string, {
                    totalQuantity: number;
                    orderQuantities: Map<string, number>;
                }>()
            };

            current.orderIds.add(order.id);
            current.totalQuantity += quantity;
            const volumeStats = current.volumes.get(volume) || {
                totalQuantity: 0,
                orderQuantities: new Map<string, number>()
            };
            volumeStats.totalQuantity += quantity;
            volumeStats.orderQuantities.set(
                order.id,
                (volumeStats.orderQuantities.get(order.id) || 0) + quantity
            );
            current.volumes.set(volume, volumeStats);
            if (new Date(order.created_at).getTime() > new Date(current.lastOrderedAt).getTime()) {
                current.lastOrderedAt = order.created_at;
            }
            aggregates.set(productId, current);
        });
    });

    return Array.from(aggregates.entries()).flatMap(([productId, aggregate]) => {
        const product = productsById.get(productId);
        if (!product || !product.in_stock || product.is_archived || aggregate.orderIds.size < 2) return [];

        const allowedVolumes = new Set(getAllowedVolumes(product));
        const preferredVolume = Array.from(aggregate.volumes.entries())
            .filter(([volume]) => allowedVolumes.has(volume))
            .sort((a, b) =>
                b[1].orderQuantities.size - a[1].orderQuantities.size
                || b[1].totalQuantity - a[1].totalQuantity
                || a[0].localeCompare(b[0], 'cs', { numeric: true })
            )[0]?.[0];

        if (!preferredVolume) return [];
        const preferredVolumeStats = aggregate.volumes.get(preferredVolume);
        if (!preferredVolumeStats) return [];

        return [{
            product,
            volume: preferredVolume,
            orderCount: aggregate.orderIds.size,
            recentOrderCount: orders.length,
            lastOrderedAt: aggregate.lastOrderedAt,
            totalQuantity: aggregate.totalQuantity,
            typicalQuantity: getMedianQuantity(Array.from(preferredVolumeStats.orderQuantities.values()))
        }];
    }).sort((a, b) =>
        b.orderCount - a.orderCount
        || new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime()
        || b.totalQuantity - a.totalQuantity
        || a.product.name.localeCompare(b.product.name, 'cs')
    );
};

export default function UsuallyOrderedRecommendations({
    userId,
    cartItems,
    products,
    onAddToCart
}: UsuallyOrderedRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadRecommendations = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        created_at,
                        order_items (
                            product_id,
                            volume,
                            quantity
                        )
                    `)
                    .eq('user_id', userId)
                    .in('status', VALID_ORDER_STATUSES)
                    .order('created_at', { ascending: false })
                    .limit(ORDER_LIMIT);

                if (error) throw error;
                if (isMounted) {
                    setRecommendations(createRecommendations((data || []) as HistoricalOrder[], products));
                }
            } catch (error) {
                // Doporučení je pouze doplňková funkce a nesmí blokovat objednávku.
                console.error('Error loading usual order recommendations:', error);
                if (isMounted) setRecommendations([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        if (products.length > 0) void loadRecommendations();
        else setIsLoading(false);

        return () => {
            isMounted = false;
        };
    }, [products, userId]);

    const productsInCart = useMemo(() => new Set(
        Object.keys(cartItems).map((key) => key.slice(0, key.lastIndexOf('-')))
    ), [cartItems]);

    const visibleRecommendations = useMemo(() => recommendations
        .filter((recommendation) => !productsInCart.has(String(recommendation.product.id)))
        .slice(0, RECOMMENDATION_LIMIT), [productsInCart, recommendations]);

    useEffect(() => {
        if (isLoading || visibleRecommendations.length === 0) return;
        trackAnalyticsEvent(ANALYTICS_EVENTS.recommendationsShown, {
            source: 'recommendation',
            itemCount: visibleRecommendations.length,
            oncePerJourney: true
        });
    }, [isLoading, visibleRecommendations.length]);

    const handleAddRecommendation = (recommendation: Recommendation) => {
        trackAnalyticsEvent(ANALYTICS_EVENTS.recommendationAdded, {
            source: 'recommendation'
        });
        onAddToCart(recommendation.product.id, recommendation.volume);
    };

    if (isLoading) {
        return (
            <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5" aria-label="Načítání doporučených položek">
                <div className="h-5 w-56 animate-pulse rounded bg-blue-100" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="h-24 animate-pulse rounded-xl bg-white/80" />
                    <div className="h-24 animate-pulse rounded-xl bg-white/80" />
                </div>
            </section>
        );
    }

    if (visibleRecommendations.length === 0) return null;

    return (
        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5" aria-labelledby="usual-order-title">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                    <h2 id="usual-order-title" className="font-semibold text-slate-950">Obvykle objednáváte také</h2>
                    <p className="mt-0.5 text-sm leading-5 text-slate-600">
                        Pravidelné položky z vašich posledních objednávek, které nyní v košíku chybí.
                    </p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {visibleRecommendations.map((recommendation) => (
                    <article
                        key={`${recommendation.product.id}-${recommendation.volume}`}
                        className="flex min-h-28 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <div>
                            <p className="font-semibold leading-5 text-slate-900">{recommendation.product.name}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                V {recommendation.orderCount} z {recommendation.recentOrderCount} posledních objednávek
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                                Obvykle {recommendation.typicalQuantity}× {getVolumeLabel(recommendation.product, recommendation.volume)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleAddRecommendation(recommendation)}
                            className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Přidat {getVolumeLabel(recommendation.product, recommendation.volume)}
                        </button>
                    </article>
                ))}
            </div>
        </section>
    );
}
