'use client';

import React, { useState } from 'react';
import { Search, X, Eye, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';
import OrderDetail from './OrderDetail';
import type { Order, AdminOrdersProps } from '../types/orders';

export default function AdminOrders({ orders, onOrdersChange, onExportOrders }: AdminOrdersProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingCsv, setIsExportingCsv] = useState(false);

    const filteredOrders = orders.filter(order =>
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        // Aktualizace seznamu objednávek po změně stavu
        if (onOrdersChange) {
            await onOrdersChange();
        }
    };

    const handleRefreshOrders = async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        try {
            if (onOrdersChange) {
                await onOrdersChange();
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    // Upravený export do CSV s anti-cache opatřeními
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

    // Upravený export do Excelu s anti-cache opatřeními
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

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Správa objednávek</h2>
                <div className="flex space-x-3">
                    <button
                        onClick={handleRefreshOrders}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-lg
                                 hover:bg-gray-200 transition-colors"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Obnovit
                    </button>
                    <button
                        onClick={handleExportToCsv}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                                 hover:bg-blue-700 transition-colors"
                        disabled={isExportingCsv}
                    >
                        <Download className="w-5 h-5 mr-2" />
                        {isExportingCsv ? 'Exportuji...' : 'Export do CSV'}
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg
                                 hover:bg-green-700 transition-colors"
                        disabled={isExportingExcel}
                    >
                        <FileSpreadsheet className="w-5 h-5 mr-2" />
                        {isExportingExcel ? 'Exportuji...' : 'Export do Excelu'}
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
                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
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
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zákazník</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objem</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stav</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    {searchQuery
                                        ? 'Nenalezeny žádné objednávky odpovídající vašemu hledání'
                                        : 'Zatím nejsou žádné objednávky'}
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {order.id.slice(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(order.created_at).toLocaleDateString('cs')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div>{order.customer_name}</div>
                                        <div className="text-gray-500">{order.customer_email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {order.total_volume}L
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                    ${getStatusColor(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Zobrazit detail"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedOrder && (
                <OrderDetail
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}
