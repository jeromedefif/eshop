'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import type { OrderStatus, OrderConfirmationData } from '@/types/orders';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
    const [orderData, setOrderData] = useState<OrderConfirmationData | null>(null);

    useEffect(() => {
        // Pokud uživatel není přihlášen, přesměrovat na přihlášení
        if (!user) {
            router.push('/login');
            return;
        }

        // Zkontrolovat, zda jsou data objednávky v localStorage
        const storedOrderData = localStorage.getItem('pendingOrderData');
        if (!storedOrderData) {
            // Pokud nejsou data k dispozici, přesměrovat na souhrn objednávky
            router.push('/order-summary');
            return;
        }

        // Načíst data objednávky z localStorage
        try {
            const parsedOrderData = JSON.parse(storedOrderData);
            setOrderData(parsedOrderData);
        } catch (error) {
            console.error('Chyba při načítání dat objednávky:', error);
            router.push('/order-summary');
        }
    }, [user, router]);

    const handleConfirmOrder = async () => {
        if (!user || !profile || !orderData) return;

        setOrderStatus('processing');

        try {
            const orderInput = {
                user_id: user.id,
                total_volume: orderData.totalVolume,
                customer_name: profile.full_name,
                customer_email: profile.email,
                customer_phone: profile.phone,
                customer_company: profile.company,
                note: orderData.customer.note || '',
                status: 'pending'
            };

            // Vytvoření objednávky
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([orderInput])
                .select()
                .single();

            if (orderError) {
                console.error('Chyba při vytváření objednávky:', orderError);
                throw orderError;
            }

            // Vytvoření položek objednávky
            const orderItems = orderData.items.map(item => ({
                order_id: order.id,
                product_id: parseInt(item.productId.toString()),
                volume: item.volume,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) {
                console.error('Chyba při vytváření položek objednávky:', itemsError);
                // Pokus o odstranění objednávky v případě chyby
                await supabase.from('orders').delete().eq('id', order.id);
                throw itemsError;
            }

            // Odeslání potvrzovacího emailu
            try {
                const emailResponse = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ orderId: order.id })
                });

                if (!emailResponse.ok) {
                    const errorData = await emailResponse.json();
                    console.error('Chyba při odesílání emailu:', errorData);
                }
            } catch (emailError) {
                console.error('Chyba při odesílání emailu:', emailError);
                // Pokračujeme i když se nepodaří odeslat email
            }

            // Nastavení statusu na dokončeno
            setOrderStatus('completed');

            // Odstranění dat objednávky z localStorage
            localStorage.removeItem('pendingOrderData');

            // Vyčištění košíku - uložíme prázdný objekt
            localStorage.setItem('cart', JSON.stringify({}));

            // Nastavení parametru pro zobrazení úspěšné hlášky
            localStorage.setItem('orderSuccess', 'true');

            // Přesměrování na hlavní stránku po úspěšném dokončení
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (error) {
            console.error('Chyba při zpracování objednávky:', error);
            setOrderStatus('error');
            toast.error('Při zpracování objednávky došlo k chybě. Zkuste to prosím znovu.');
        }
    };

    const handleCancel = () => {
        if (orderStatus === 'processing') return;
        router.push('/order-summary');
    };

    if (!orderData) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
                    <div className="text-center py-8">
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
                        <h2 className="text-lg font-medium">Načítání dat objednávky...</h2>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/order-summary"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět k souhrnu
                    </Link>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Potvrzení objednávky</h1>

                {/* Stavový indikátor */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {['Kontrola', 'Zpracování', 'Dokončeno'].map((step, index) => (
                            <div key={step} className="flex flex-col items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                    orderStatus === 'completed' ? 'bg-green-500 text-white' :
                                    orderStatus === 'processing' && index <= 1 ? 'bg-blue-500 text-white' :
                                    orderStatus === 'error' ? 'bg-red-500 text-white' :
                                    'bg-gray-200'
                                }`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm text-gray-600">{step}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full relative">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                orderStatus === 'completed' ? 'bg-green-500 w-full' :
                                orderStatus === 'processing' ? 'bg-blue-500 w-2/3' :
                                orderStatus === 'error' ? 'bg-red-500' :
                                'bg-blue-500 w-1/3'
                            }`}
                        />
                    </div>
                </div>

                {/* Objednané položky */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Objednané položky:</h3>
                    <div className="space-y-2 mb-4">
                        {orderData.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-gray-700">
                                <span>{item.productName}</span>
                                <span>{item.display}</span>
                            </div>
                        ))}
                    </div>
                    {orderData.totalVolume > 0 && (
                        <div className="border-t pt-2 font-semibold text-gray-900">
                            Celkový objem nápojů: {orderData.totalVolume}L
                        </div>
                    )}
                </div>

                {/* Kontaktní údaje */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Kontaktní údaje:</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                            <span className="font-medium">Jméno:</span>
                            <span>{orderData.customer.name}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                            <span className="font-medium">Email:</span>
                            <span>{orderData.customer.email}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                            <span className="font-medium">Telefon:</span>
                            <span>{orderData.customer.phone}</span>
                        </div>
                        {orderData.customer.company && (
                            <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                                <span className="font-medium">Firma:</span>
                                <span>{orderData.customer.company}</span>
                            </div>
                        )}
                        {orderData.customer.note && (
                            <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                                <span className="font-medium">Poznámka:</span>
                                <span>{orderData.customer.note}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Akční tlačítka */}
                {orderStatus === 'error' ? (
                    <div className="flex items-center justify-center p-4 bg-red-50 text-red-700 rounded-lg">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span>Došlo k chybě při zpracování objednávky</span>
                    </div>
                ) : orderStatus === 'completed' ? (
                    <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span>Objednávka byla úspěšně dokončena</span>
                    </div>
                ) : (
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                            disabled={orderStatus === 'processing'}
                        >
                            Zpět
                        </button>
                        <button
                            onClick={handleConfirmOrder}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            disabled={orderStatus === 'processing'}
                        >
                            {orderStatus === 'processing' ? (
                                <div className="flex items-center">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span>Zpracovávám...</span>
                                </div>
                            ) : 'Potvrdit objednávku'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
