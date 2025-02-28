'use client';

import { useState, useEffect } from 'react';
import AdminOrders from '@/components/AdminOrders';
import { Loader2 } from 'lucide-react';
import type { Order } from '@/types/orders';
import { useAuth } from '@/contexts/AuthContext';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { isAdmin } = useAuth();

    const fetchOrders = async () => {
        try {
            setLoading(true);
            console.log('Načítání objednávek pro administrátora...');

            // Přidáme timestamp pro zabránění cachování
            const timestamp = Date.now();
            const response = await fetch(`/api/orders?t=${timestamp}`, {
                // Explicitně nastavíme hlavičky pro zabránění cachování
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Načteno ${data.length} objednávek`);
            setOrders(data || []);
        } catch (error) {
            console.error('Chyba při načítání objednávek:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportOrders = async () => {
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/orders/export?t=${timestamp}`, {
                cache: 'no-store'
            });

            if (!response.ok) throw new Error('Export selhal');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Chyba při exportu:', error);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchOrders();
        }
    }, [isAdmin]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <AdminOrders
                orders={orders}
                onOrdersChange={fetchOrders}
                onExportOrders={handleExportOrders}
            />
        </div>
    );
}
