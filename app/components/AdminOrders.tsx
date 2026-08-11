'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw, FileSpreadsheet, Calendar, Box, TestTube, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { Order, AdminOrdersProps } from '../types/orders';

export default function AdminOrders({
  orders,
  onOrdersChange,
  onExportOrders
}: AdminOrdersProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOrders, setFilteredOrders] = useState<Order[]>(orders);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
    const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [isExportingSelectedExcel, setIsExportingSelectedExcel] = useState(false);
    const router = useRouter();

    // Při změně vstupních orders aktualizujeme i filtrované orders
    useEffect(() => {
        setFilteredOrders(orders);
    }, [orders]);

    useEffect(() => {
        if (!isSelectionMode) return;
        const allowed = new Set(filteredOrders.map((order) => order.id));
        setSelectedOrderIds((prev) => {
            const next = new Set<string>();
            prev.forEach((id) => {
                if (allowed.has(id)) next.add(id);
            });
            return next;
        });
    }, [filteredOrders, isSelectionMode]);

    // Efekt pro vyhledávání - při změně searchQuery filtrujeme orders
    useEffect(() => {
        if (!searchQuery.trim()) {
            // Pokud je dotaz prázdný, zobrazíme všechny objednávky
            setFilteredOrders(orders);
            return;
        }

        // Filtrujeme objednávky na klientské straně
        const lowercaseQuery = searchQuery.toLowerCase();
        const filtered = orders.filter(order =>
            order.customer_name.toLowerCase().includes(lowercaseQuery) ||
            order.customer_email.toLowerCase().includes(lowercaseQuery) ||
            (order.customer_company && order.customer_company.toLowerCase().includes(lowercaseQuery)) ||
            (order.note && order.note.toLowerCase().includes(lowercaseQuery)) ||
            order.id.toLowerCase().includes(lowercaseQuery)
        );

        setFilteredOrders(filtered);
    }, [searchQuery, orders]);

    // Funkce pro získání textu období
    const getPeriodText = (period: typeof selectedPeriod) => {
        switch (period) {
            case 'week':
                return 'Týden';
            case 'month':
                return 'Měsíc';
            case 'year':
                return 'Rok';
            case 'all':
                return 'Vše';
            default:
                return 'Měsíc';
        }
    };

    // Funkce pro získání popisu období
    const getPeriodDescription = (period: typeof selectedPeriod) => {
        switch (period) {
            case 'week':
                return 'posledních 7 dnů';
            case 'month':
                return 'posledních 30 dnů';
            case 'year':
                return 'poslední rok';
            case 'all':
                return 'všechny objednávky';
            default:
                return 'posledních 30 dnů';
        }
    };

    // Upravená funkce handleRefreshOrders s podporou období
    const handleRefreshOrders = async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        try {
            if (onOrdersChange) {
                await onOrdersChange(selectedPeriod);
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    // Funkce pro změnu období
    const handlePeriodChange = async (period: typeof selectedPeriod) => {
        setSelectedPeriod(period);
        setIsRefreshing(true);
        try {
            if (onOrdersChange) {
                await onOrdersChange(period);
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    // Export do Excelu s anti-cache opatřeními
    const handleExportToExcel = async () => {
        if (isExportingExcel) return;

        setIsExportingExcel(true);
        try {
            const timestamp = Date.now();
            console.log('Začíná export do Excelu:', timestamp);

            const response = await fetch(`/api/orders/export-excel?t=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Chyba při exportu do Excelu:', response.status, errorText);
                throw new Error(`Export do Excelu selhal: ${response.status} ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `objednavky-cekajici-na-vyrizeni-${date}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('Export do Excelu dokončen');
        } catch (error) {
            console.error('Chyba při exportu do Excelu:', error);
            alert('Nepodařilo se exportovat data do Excelu. Zkuste to prosím znovu.');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const toggleSelectAllFiltered = () => {
        const ids = filteredOrders.map((order) => order.id);
        const allSelected = ids.length > 0 && ids.every((id) => selectedOrderIds.has(id));
        if (allSelected) {
            setSelectedOrderIds(new Set());
            return;
        }
        setSelectedOrderIds(new Set(ids));
    };

    const handleToggleSelectionMode = () => {
        setIsSelectionMode((prev) => {
            const next = !prev;
            if (!next) {
                setSelectedOrderIds(new Set());
            }
            return next;
        });
    };

    const handleExportSelectedToExcel = async () => {
        if (selectedOrderIds.size === 0 || isExportingSelectedExcel) return;

        setIsExportingSelectedExcel(true);
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/orders/export-excel-selected?t=${timestamp}`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                body: JSON.stringify({ orderIds: Array.from(selectedOrderIds) })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Export vybraných objednávek selhal: ${response.status} ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `objednavky-vybrane-${date}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setSelectedOrderIds(new Set());
            setIsSelectionMode(false);
        } catch (error) {
            console.error('Chyba při exportu vybraných objednávek:', error);
            alert('Nepodařilo se exportovat vybrané objednávky. Zkuste to prosím znovu.');
        } finally {
            setIsExportingSelectedExcel(false);
        }
    };

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: Order['status']) => {
        switch (status) {
            case 'pending': return 'Čeká na potvrzení';
            case 'confirmed': return 'Potvrzeno';
            case 'cancelled': return 'Zrušeno';
            default: return status;
        }
    };

    // Navigate to order detail page
    const handleViewOrderDetail = (orderId: string) => {
        router.push(`/admin/orders/${orderId}`);
    };

    // Formátování data s časem
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: format(date, 'dd.MM.yyyy', { locale: cs }),
            time: format(date, 'HH:mm', { locale: cs })
        };
    };

    const getLogisticsFlags = (order: Order) => {
        const categories = new Set(
            (order.order_items || []).map((item) => item.product?.category || '')
        );

        return {
            hasPet: categories.has('PET'),
            // "Dusík" is kept for historical orders created before the category rename.
            hasGases: categories.has('Plyny') || categories.has('Dusík')
        };
    };

    const LogisticsBadges = ({ order }: { order: Order }) => {
        const { hasPet, hasGases } = getLogisticsFlags(order);
        if (!hasPet && !hasGases) return null;

        return (
            <span className="inline-flex flex-wrap items-center gap-1.5">
                {hasPet && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"><Box className="h-3.5 w-3.5" />PET</span>}
                {hasGases && <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800"><TestTube className="h-3.5 w-3.5" />Plyny</span>}
            </span>
        );
    };

    // Komponenta karty objednávky pro mobilní zobrazení
    const OrderCard = ({ order }: { order: Order }) => {
        const dateTime = formatDateTime(order.created_at);

        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => handleViewOrderDetail(order.id)} className="font-semibold text-slate-900 hover:text-blue-700">
                                {order.customer_name}
                            </button>
                            <LogisticsBadges order={order} />
                        </div>
                        {order.customer_company && (
                            <div className="text-sm text-slate-600">{order.customer_company}</div>
                        )}
                        <a href={`mailto:${order.customer_email}`} className="text-sm text-slate-500 hover:text-blue-700 hover:underline">{order.customer_email}</a>
                    </div>
                    <button
                        onClick={() => handleViewOrderDetail(order.id)}
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}
                        title="Zobrazit detail"
                    >
                        {getStatusText(order.status)}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-slate-700">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Datum</div>
                        {dateTime.date} <span className="text-slate-500">{dateTime.time}</span>
                    </div>
                    <div className="text-right font-semibold text-blue-700">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Objem</div>
                        {order.total_volume} L
                    </div>
                    <div className="text-right font-semibold text-slate-700">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Položky</div>
                        {order.order_items?.length ?? 0}
                    </div>
                </div>
                {order.note && order.note.trim() && (
                    <div className="mt-3 flex gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600" title={order.note}>
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span className="line-clamp-2">{order.note}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mx-auto w-full max-w-none">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Správa objednávek</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Zobrazeny objednávky za {getPeriodDescription(selectedPeriod)}
                    </p>
                </div>

                {/* Nástrojová lišta */}
                <div className="flex w-full flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:w-auto sm:flex-nowrap">
                    {/* Dropdown pro výběr období */}
                    <div className="relative">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => handlePeriodChange(e.target.value as typeof selectedPeriod)}
                            className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-800 shadow-sm transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isRefreshing}
                        >
                            <option value="week">Týden</option>
                            <option value="month">Měsíc</option>
                            <option value="year">Rok</option>
                            <option value="all">Vše</option>
                        </select>
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>

                    <button
                        onClick={handleRefreshOrders}
                        className="flex flex-1 items-center justify-center rounded-lg bg-white px-3 py-2 text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 sm:flex-none"
                        disabled={isRefreshing}
                        title="Obnovit"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="ml-2 hidden sm:inline">
                            Obnovit
                        </span>
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-white shadow-sm transition-colors hover:bg-emerald-700 sm:flex-none"
                        disabled={isExportingExcel}
                        title="Export do Excelu"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        <span className="ml-2 hidden sm:inline">
                            {isExportingExcel ? 'Exportuji...' : 'Excel'}
                        </span>
                    </button>
                    <button
                        onClick={isSelectionMode ? handleExportSelectedToExcel : handleToggleSelectionMode}
                        className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:flex-none"
                        disabled={isSelectionMode && (selectedOrderIds.size === 0 || isExportingSelectedExcel)}
                        title={isSelectionMode ? 'Export vybraných objednávek do Excelu' : 'Zapnout výběr objednávek pro export'}
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        <span className="ml-2 hidden sm:inline">
                            {isSelectionMode
                                ? (isExportingSelectedExcel
                                    ? 'Exportuji vybrané...'
                                    : `Export vybraných (${selectedOrderIds.size})`)
                                : 'Vybrat pro export'}
                        </span>
                    </button>
                </div>
            </div>

            {isSelectionMode && (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                    Označte objednávky v tabulce a klikněte na
                    {' '}<span className="font-semibold">Export vybraných</span>.
                    <button
                        onClick={handleToggleSelectionMode}
                        className="ml-3 font-semibold text-blue-700 hover:text-blue-900"
                    >
                        Zrušit výběr
                    </button>
                </div>
            )}

            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Vyhledat objednávku..."
                        className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="mt-1 text-xs text-gray-600">
                        Nalezeno {filteredOrders.length} objednávek
                    </div>
                )}
            </div>

            {/* Mobilní zobrazení - karty */}
            <div className="md:hidden">
                {filteredOrders.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <Search className="mx-auto mb-2 h-10 w-10 text-slate-400" />
                        <p className="text-base text-slate-600">
                            {searchQuery
                                ? 'Nenalezeny žádné objednávky odpovídající vašemu hledání'
                                : `Zatím nejsou žádné objednávky za ${getPeriodDescription(selectedPeriod)}`}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                                Zobrazit všechny objednávky
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop zobrazení - tabulka */}
            <div className="hidden md:block">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {isSelectionMode && (
                                    <th className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredOrders.length > 0 &&
                                                filteredOrders.every((order) => selectedOrderIds.has(order.id))
                                            }
                                            onChange={toggleSelectAllFiltered}
                                            aria-label="Vybrat všechny objednávky"
                                        />
                                    </th>
                                )}
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stav</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Zákazník / logistika</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Objem</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Položky</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-10 text-center text-slate-500">
                                        {searchQuery
                                            ? 'Nenalezeny žádné objednávky odpovídající vašemu hledání'
                                            : `Zatím nejsou žádné objednávky za ${getPeriodDescription(selectedPeriod)}`}
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const dateTime = formatDateTime(order.created_at);
                                    const hasNote = Boolean(order.note && order.note.trim());
                                    const isHovered = hoveredOrderId === order.id;
                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr
                                                className={`border-t border-slate-100 transition-colors ${isHovered ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                                                onMouseEnter={() => setHoveredOrderId(order.id)}
                                                onMouseLeave={() => setHoveredOrderId(null)}
                                            >
                                                {isSelectionMode && (
                                                    <td className="px-4 py-4 align-top">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOrderIds.has(order.id)}
                                                            onChange={() => toggleOrderSelection(order.id)}
                                                            aria-label={`Vybrat objednávku ${order.id}`}
                                                        />
                                                    </td>
                                                )}
                                                <td className="whitespace-nowrap px-5 py-4 align-top">
                                                    <button
                                                        onClick={() => handleViewOrderDetail(order.id)}
                                                        className={`inline-flex cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold leading-5 transition-opacity hover:opacity-80 ${getStatusColor(order.status)}`}
                                                    >
                                                        {getStatusText(order.status)}
                                                    </button>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-slate-900">
                                                    <div className="font-medium">{dateTime.date}</div>
                                                    <div className="text-xs text-slate-500">{dateTime.time}</div>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-slate-900">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewOrderDetail(order.id)}
                                                            className="font-semibold text-slate-900 transition-colors hover:text-blue-700"
                                                        >
                                                            {order.customer_name}
                                                        </button>
                                                        <LogisticsBadges order={order} />
                                                    </div>
                                                    {order.customer_company && (
                                                        <div className="mt-0.5 text-slate-600">{order.customer_company}</div>
                                                    )}
                                                    <a href={`mailto:${order.customer_email}`} className="mt-0.5 inline-block text-slate-500 transition-colors hover:text-blue-700 hover:underline">
                                                        {order.customer_email}
                                                    </a>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-right align-top text-sm font-bold text-blue-700">
                                                    {order.total_volume} L
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-right align-top text-sm text-slate-700">
                                                    <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                                        {order.order_items?.length ?? 0}
                                                    </span>
                                                </td>
                                            </tr>
                                            {hasNote && (
                                                <tr
                                                    className={`transition-colors ${isHovered ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                                                    onMouseEnter={() => setHoveredOrderId(order.id)}
                                                    onMouseLeave={() => setHoveredOrderId(null)}
                                                >
                                                    <td colSpan={isSelectionMode ? 6 : 5} className="px-5 pb-4 pt-0 text-sm text-slate-700">
                                                        <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5" title={order.note || ''}>
                                                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                                            <span className="min-w-0">
                                                                <span className="mr-1 font-semibold text-slate-800">Poznámka zákazníka:</span>
                                                                {order.note}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
