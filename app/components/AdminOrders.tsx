'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Download, RefreshCw, FileSpreadsheet, Calendar } from 'lucide-react';
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
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
    const router = useRouter();

    // Při změně vstupních orders aktualizujeme i filtrované orders
    useEffect(() => {
        setFilteredOrders(orders);
    }, [orders]);

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

    // Export do CSV s anti-cache opatřeními
    const handleExportToCsv = async () => {
        if (isExportingCsv) return;

        setIsExportingCsv(true);
        try {
            const timestamp = Date.now();
            console.log('Začíná export do CSV:', timestamp);

            const response = await fetch(`/api/orders/export?t=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Chyba při exportu do CSV:', response.status, errorText);
                throw new Error(`Export do CSV selhal: ${response.status} ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `objednavky-cekajici-na-vyrizeni-${date}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('Export do CSV dokončen');
        } catch (error) {
            console.error('Chyba při exportu do CSV:', error);
            alert('Nepodařilo se exportovat data do CSV. Zkuste to prosím znovu.');
        } finally {
            setIsExportingCsv(false);
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

    // Komponenta karty objednávky pro mobilní zobrazení
    const OrderCard = ({ order }: { order: Order }) => {
        const dateTime = formatDateTime(order.created_at);

        return (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{order.customer_name}</div>
                        {order.customer_company && (
                            <div className="text-sm text-gray-700">{order.customer_company}</div>
                        )}
                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                    </div>
                    <button
                        onClick={() => handleViewOrderDetail(order.id)}
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}
                        title="Zobrazit detail"
                    >
                        {getStatusText(order.status)}
                    </button>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-700">
                        {dateTime.date} <span className="text-gray-500">{dateTime.time}</span>
                    </div>
                    <div className="font-medium text-gray-900">
                        {order.total_volume}L
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Správa objednávek</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Zobrazeny objednávky za {getPeriodDescription(selectedPeriod)}
                    </p>
                </div>

                {/* Nástrojová lišta */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    {/* Dropdown pro výběr období */}
                    <div className="relative">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => handlePeriodChange(e.target.value as typeof selectedPeriod)}
                            className="appearance-none px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg text-gray-800
                                     hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="flex-1 sm:flex-none flex justify-center items-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg
                                 hover:bg-gray-200 transition-colors"
                        disabled={isRefreshing}
                        title="Obnovit"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="ml-2 hidden sm:inline">
                            Obnovit
                        </span>
                    </button>
                    <button
                        onClick={handleExportToCsv}
                        className="flex-1 sm:flex-none flex justify-center items-center px-3 py-2 bg-blue-600 text-white rounded-lg
                                 hover:bg-blue-700 transition-colors"
                        disabled={isExportingCsv}
                        title="Export do CSV"
                    >
                        <Download className="w-5 h-5" />
                        <span className="ml-2 hidden sm:inline">
                            {isExportingCsv ? 'Exportuji...' : 'CSV'}
                        </span>
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="flex-1 sm:flex-none flex justify-center items-center px-3 py-2 bg-green-600 text-white rounded-lg
                                 hover:bg-green-700 transition-colors"
                        disabled={isExportingExcel}
                        title="Export do Excelu"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        <span className="ml-2 hidden sm:inline">
                            {isExportingExcel ? 'Exportuji...' : 'Excel'}
                        </span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Vyhledat objednávku..."
                        className="block w-full pl-10 pr-4 py-2 border rounded-lg
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                    <div className="bg-white rounded-lg p-8 text-center">
                        <Search className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-base">
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
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stav</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zákazník</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery
                                            ? 'Nenalezeny žádné objednávky odpovídající vašemu hledání'
                                            : `Zatím nejsou žádné objednávky za ${getPeriodDescription(selectedPeriod)}`}
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const dateTime = formatDateTime(order.created_at);
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleViewOrderDetail(order.id)}
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                                        ${getStatusColor(order.status)} cursor-pointer hover:opacity-80`}
                                                >
                                                    {getStatusText(order.status)}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>{dateTime.date}</div>
                                                <div className="text-xs text-gray-500">{dateTime.time}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div>{order.customer_name}</div>
                                                {order.customer_company && (
                                                    <div className="text-gray-700">{order.customer_company}</div>
                                                )}
                                                <div className="text-gray-500">{order.customer_email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {order.total_volume}L
                                            </td>
                                        </tr>
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
