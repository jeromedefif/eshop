'use client';

import React from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface OrderDetailProps {
    order: {
        id: string;
        created_at: string;
        customer_name: string;
        customer_email: string;
        customer_phone: string | null;
        customer_company: string | null;
        total_volume: string;
        status: string;
        note: string | null;
        order_items: Array<{
            id: string;
            quantity: number;
            volume: string;
            product: {
                id: string;
                name: string;
                category: string;
            }
        }>;
    };
    onClose: () => void;
}

const OrderDetail = ({ order, onClose }: OrderDetailProps) => {
    const formatDisplay = (item: OrderDetailProps['order']['order_items'][0]) => {
        const { category } = item.product;
        const { quantity, volume } = item;

        if (category === 'PET') {
            return `${quantity}x, balení`;
        }
        if (category === 'Dusík') {
            return `${quantity}x, ${volume === 'maly' ? 'malý' : 'velký'}`;
        }
        return `${quantity}x, ${volume}L`;
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
                        >
                            ✕
                        </button>
                    </div>

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
                                <span className={`px-2 py-1 inline-flex text-sm font-semibold rounded-full ${
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {order.status}
                                </span>
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
                                                {formatDisplay(item)}
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
