import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        order_items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Konvertujeme BigInt na string před serializací
    const serializedOrders = JSON.parse(JSON.stringify(
      orders,
      (key, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value
    ));

    return NextResponse.json(serializedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání objednávek' },
      { status: 500 }
    );
  }
}
