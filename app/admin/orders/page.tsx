'use client';

import { useState, useEffect } from 'react';
import AdminOrders from '@/components/AdminOrders';
import { Loader2 } from 'lucide-react';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('Nepodařilo se načíst objednávky');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Chyba při načítání objednávek:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportOrders = async () => {
        try {
            const response = await fetch('/api/orders/export');
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
        fetchOrders();
    }, []);

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
