import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Order } from '@/types/orders';

export async function GET() {
    try {
        const prismaOrders = await prisma.order.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                order_items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // Převedeme Prisma data na náš Order typ
        const orders: Order[] = prismaOrders.map(order => ({
            ...order,
            created_at: order.created_at.toISOString(),
            updated_at: order.updated_at.toISOString(),
            total_volume: order.total_volume.toString()
        }));

        const csvRows = [
            // Header
            ['ID', 'Datum vytvoření', 'Jméno zákazníka', 'Email zákazníka', 'Celkový objem', 'Status'],
            // Data rows
            ...orders.map((order) => [
                order.id,
                new Date(order.created_at).toLocaleDateString('cs'),
                order.customer_name,
                order.customer_email,
                `${order.total_volume}L`,
                order.status
            ])
        ];

        const csvContent = csvRows
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=orders-${new Date().toISOString().split('T')[0]}.csv`
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Chyba při exportu objednávek' },
            { status: 500 }
        );
    }
}
