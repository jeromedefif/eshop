'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { OrderDetailProps } from '../types/orders';
import { formatOrderDisplay } from '../lib/formatters';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const OrderDetail = ({ order, onClose, onStatusChange }: OrderDetailProps) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState(order.status);
    const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) return;

        setIsUpdating(true);
        setUpdateMessage(null);

        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Nepodařilo se aktualizovat status objednávky');
            }

            // Nastavit nový status
            setStatus(newStatus);
            setUpdateMessage({
                type: 'success',
                text: 'Status objednávky byl úspěšně aktualizován'
            });

            // Volání callback funkce pro aktualizaci seznamu objednávek
            if (onStatusChange) {
                await onStatusChange(order.id, newStatus);
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            setUpdateMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Nepodařilo se aktualizovat status objednávky'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusColor = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'Čeká na zpracování';
            case 'confirmed': return 'Potvrzeno';
            case 'completed': return 'Dokončeno';
            default: return currentStatus;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-[80vw] max-w-5xl max-h-[85vh] overflow-y-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Detail objednávky</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Zavřít"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Zobrazení zprávy o aktualizaci */}
                    {updateMessage && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center ${
                            updateMessage.type === 'success'
                                ? 'bg-green-50 text-green-800'
                                : 'bg-red-50 text-red-800'
                        }`}>
                            {updateMessage.type === 'success'
                                ? <CheckCircle className="w-5 h-5 mr-2" />
                                : <AlertCircle className="w-5 h-5 mr-2" />
                            }
                            {updateMessage.text}
                        </div>
                    )}

                    {/* Základní informace */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Základní informace</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-700">ID objednávky</p>
                                <p className="font-medium text-gray-900">{order.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-700">Datum vytvoření</p>
                                <p className="font-medium text-gray-900">
                                    {format(new Date(order.created_at), 'PPP', { locale: cs })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-700">Stav</p>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 inline-flex text-sm font-semibold rounded-full ${
                                        getStatusColor(status)
                                    }`}>
                                        {getStatusText(status)}
                                    </span>

                                    {/* Přidání výběru stavu */}
                                    <div className="relative ml-2">
                                        <select
                                            value={status}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                            className="px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900 appearance-none pl-3 pr-10"
                                            disabled={isUpdating}
                                        >
                                            <option value="pending">Čeká na zpracování</option>
                                            <option value="confirmed">Potvrzeno</option>
                                            <option value="completed">Dokončeno</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>

                                    {isUpdating && (
                                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-700">Celkový objem</p>
                                <p className="font-medium text-gray-900">{order.total_volume}L</p>
                            </div>
                        </div>
                    </div>

                    {/* Informace o zákazníkovi */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Informace o zákazníkovi</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-700">Jméno</p>
                                <p className="font-medium text-gray-900">{order.customer_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-700">Email</p>
                                <p className="font-medium text-gray-900">{order.customer_email}</p>
                            </div>
                            {order.customer_phone && (
                                <div>
                                    <p className="text-sm text-gray-700">Telefon</p>
                                    <p className="font-medium text-gray-900">{order.customer_phone}</p>
                                </div>
                            )}
                            {order.customer_company && (
                                <div>
                                    <p className="text-sm text-gray-700">Společnost</p>
                                    <p className="font-medium text-gray-900">{order.customer_company}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Poznámka k objednávce, pokud existuje */}
                    {order.note && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Poznámka</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-900">{order.note}</p>
                            </div>
                        </div>
                    )}

                    {/* Položky objednávky */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Položky objednávky</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Produkt</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Kategorie</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Množství a Objem</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {order.order_items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.product.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.product.category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                {formatOrderDisplay(item)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;
