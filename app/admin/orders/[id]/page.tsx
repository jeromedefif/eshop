'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import prisma from '@/lib/prisma';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatOrderDisplay } from '@/lib/formatters';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import { toast } from 'react-toastify';

const OrderDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fetch order data
    useEffect(() => {
        const fetchOrderDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/orders/${orderId}`);
                if (!response.ok) {
                    throw new Error('Nepodařilo se načíst detail objednávky');
                }
                const data = await response.json();
                setOrder(data);
                setStatus(data.status);
            } catch (error) {
                console.error('Error fetching order details:', error);
                toast.error('Nepodařilo se načíst detail objednávky');
            } finally {
                setIsLoading(false);
            }
        };

        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) return;

        setIsUpdating(true);
        setUpdateMessage(null);

        try {
            // 1. Aktualizace statusu objednávky v databázi
            const response = await fetch(`/api/orders/${orderId}`, {
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

            // 2. Odeslání emailu zákazníkovi při změně stavu (pouze pro confirmed a cancelled)
            if (newStatus === 'confirmed' || newStatus === 'cancelled') {
                try {
                    const emailResponse = await fetch('/api/orders/send-status-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: orderId,
                            status: newStatus
                        }),
                    });

                    if (!emailResponse.ok) {
                        console.warn('Nepodařilo se odeslat email, ale status byl změněn');
                    } else {
                        console.log('Email byl úspěšně odeslán');
                    }
                } catch (emailError) {
                    console.warn('Chyba při odesílání emailu:', emailError);
                    // Pokračujeme dál i v případě chyby s emailem
                }
            }

            // 3. Nastavit nový status v UI
            setStatus(newStatus);
            setUpdateMessage({
                type: 'success',
                text: `Status objednávky byl úspěšně změněn na "${getStatusText(newStatus)}"`
            });

            toast.success(`Status objednávky byl úspěšně změněn`);
        } catch (error) {
            console.error('Error updating order status:', error);
            setUpdateMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Nepodařilo se aktualizovat status objednávky'
            });
            toast.error('Nepodařilo se aktualizovat status objednávky');
        } finally {
            setIsUpdating(false);
        }
    };

    // Nová funkce pro mazání objednávky
    const handleDeleteOrder = async () => {
        setIsDeleting(true);
        setUpdateMessage(null);

        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Nepodařilo se smazat objednávku');
            }

            toast.success('Objednávka byla úspěšně smazána');

            // Přesměrování zpět na seznam objednávek
            router.push('/admin/orders');
        } catch (error) {
            console.error('Error deleting order:', error);
            setUpdateMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Nepodařilo se smazat objednávku'
            });
            toast.error('Nepodařilo se smazat objednávku');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const getStatusColor = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'Čeká na potvrzení';
            case 'confirmed': return 'Potvrzeno';
            case 'cancelled': return 'Zrušeno';
            default: return currentStatus;
        }
    };

    // Komponenta pro potvrzovací dialog
    const DeleteConfirmationDialog = () => {
        if (!showDeleteConfirm) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Potvrzení smazání</h3>
                    <p className="text-gray-700 mb-6">
                        Opravdu chcete smazat tuto objednávku? Tato akce je nevratná a smaže všechny související položky.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                            disabled={isDeleting}
                        >
                            Zrušit
                        </button>
                        <button
                            onClick={handleDeleteOrder}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <span className="flex items-center">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mazání...
                                </span>
                            ) : (
                                'Smazat objednávku'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Načítání objednávky...</span>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-600">Objednávka nebyla nalezena nebo nemáte oprávnění k jejímu zobrazení.</p>
                    <Link
                        href="/admin/orders"
                        className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na seznam objednávek
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center mb-6">
                <Link
                    href="/admin/orders"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na seznam objednávek
                </Link>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Detail objednávky</h1>

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
                        <h2 className="text-lg font-semibold mb-3">Základní informace</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600">ID objednávky</p>
                                <p className="font-medium text-gray-900">{order.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Datum vytvoření</p>
                                <p className="font-medium text-gray-900">
                                    {format(new Date(order.created_at), 'PPP', { locale: cs })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Stav</p>
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
                                            <option value="pending">Čeká na potvrzení</option>
                                            <option value="confirmed">Potvrzeno</option>
                                            <option value="cancelled">Zrušeno</option>
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
                                <p className="text-sm text-gray-600">Celkový objem</p>
                                <p className="font-medium text-gray-900">{order.total_volume}L</p>
                            </div>
                        </div>
                    </div>

                    {/* Informace o zákazníkovi */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-3">Informace o zákazníkovi</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600">Jméno</p>
                                <p className="font-medium text-gray-900">{order.customer_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="font-medium text-gray-900">{order.customer_email}</p>
                            </div>
                            {order.customer_phone && (
                                <div>
                                    <p className="text-sm text-gray-600">Telefon</p>
                                    <p className="font-medium text-gray-900">{order.customer_phone}</p>
                                </div>
                            )}
                            {order.customer_company && (
                                <div>
                                    <p className="text-sm text-gray-600">Společnost</p>
                                    <p className="font-medium text-gray-900">{order.customer_company}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Poznámka k objednávce, pokud existuje */}
                    {order.note && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-3">Poznámka</h2>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-900">{order.note}</p>
                            </div>
                        </div>
                    )}

                    {/* Položky objednávky */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-3">Položky objednávky</h2>
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
                                    {order.order_items.map((item: any) => (
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

                    {/* Tlačítko pro smazání objednávky */}
                    <div className="border-t pt-6 mt-6">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Smazat objednávku
                        </button>
                        <p className="text-sm text-gray-500 mt-2">
                            Tato akce je nevratná a smaže objednávku včetně všech položek.
                        </p>
                    </div>
                </div>
            </div>

            {/* Potvrzovací dialog pro smazání */}
            <DeleteConfirmationDialog />
        </div>
    );
};

export default withAdminAuth(OrderDetailPage);
