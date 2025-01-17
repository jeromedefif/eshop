'use client';

import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import OrderConfirmationDialog from './OrderConfirmationDialog';
import OrderSummary from './OrderSummary';

type Product = {
    id: number;
    name: string;
    category: string;
    in_stock: boolean;
    created_at?: string;
};

type OrderFormProps = {
    cartItems: {[key: string]: number};
    products: Array<Product>;
    onRemoveFromCart: (productId: number, volume: string | number) => void;
    onAddToCart: (productId: number, volume: string | number) => void;
    onClearCart: () => void;
    totalVolume: number;
    user: User | null;
    profile: {
        id: string;
        email: string;
        full_name: string | null;
        company: string | null;
        phone: string | null;
    } | null;
};

const OrderForm = ({
    cartItems,
    products,
    onRemoveFromCart,
    onAddToCart,
    onClearCart,
    totalVolume,
    user,
    profile
}: OrderFormProps) => {
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [orderStatus, setOrderStatus] = useState<'pending' | 'processing' | 'completed' | 'error'>('pending');
    const [note, setNote] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsConfirmationOpen(true);
    };

    const handleConfirmOrder = async () => {
        setOrderStatus('processing');
        try {
            const orderData = {
                user_id: user?.id,
                total_volume: totalVolume,
                note: note,
                status: 'pending'
            };

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([orderData])
                .select()
                .single();

            if (orderError) throw orderError;

            const orderItems = Object.entries(cartItems).map(([key, quantity]) => {
                const [productId, volume] = key.split('-');
                return {
                    order_id: order.id,
                    product_id: parseInt(productId),
                    volume: volume,
                    quantity: quantity
                };
            });

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            setOrderStatus('completed');
            setTimeout(() => {
                setIsConfirmationOpen(false);
                onClearCart();
                setNote('');
            }, 2000);
        } catch (error) {
            console.error('Error creating order:', error);
            setOrderStatus('error');
        }
    };

    const getOrderSummary = () => {
        const items = Object.entries(cartItems).map(([key, quantity]) => {
            const [productId, volume] = key.split('-');
            const product = products.find(p => p.id === parseInt(productId));
            if (!product) return null;

            return {
                productName: product.name,
                volume: volume as string | number,
                quantity,
                display: product.category === 'PET'
                    ? `${quantity}× balení`
                    : product.category === 'Dusík'
                        ? `${quantity}× ${volume === 'maly' ? 'malý' : 'velký'}`
                        : `${volume}L × ${quantity}`
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        return {
            items,
            totalVolume,
            customer: {
                name: profile?.full_name || '',
                email: profile?.email || '',
                phone: profile?.phone || '',
                company: profile?.company || '',
                note: note
            }
        };
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <OrderSummary
                cartItems={cartItems}
                products={products}
                onRemoveFromCart={onRemoveFromCart}
                onAddToCart={onAddToCart}
                totalVolume={totalVolume}
            />

            <div className="mt-6 bg-white rounded-lg shadow">
                <div className="p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Poznámka k objednávce</h2>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Další informace k objednávce..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(cartItems).length === 0 || !user}
                        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg
                                 hover:bg-blue-700 transition-colors disabled:bg-gray-400
                                 disabled:cursor-not-allowed"
                    >
                        {!user
                            ? 'Pro odeslání objednávky se prosím přihlaste'
                            : Object.keys(cartItems).length === 0
                                ? 'Nejdříve přidejte položky do košíku'
                                : 'Odeslat objednávku'
                        }
                    </button>
                </div>
            </div>

            <OrderConfirmationDialog
                isOpen={isConfirmationOpen}
                onClose={() => {
                    if (orderStatus !== 'processing') {
                        setIsConfirmationOpen(false);
                        setOrderStatus('pending');
                    }
                }}
                onConfirm={handleConfirmOrder}
                orderData={getOrderSummary()}
                orderStatus={orderStatus}
            />
        </div>
    );
};

export default OrderForm;
