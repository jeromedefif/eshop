import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// Zakázat caching pro dynamická data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Update order status API called', new Date().toISOString(), 'for orderId:', params.id);

  try {
    const { id } = params;
    const { status } = await request.json();

    console.log('Updating order', id, 'to status:', status);

    // Validace statusu
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Neplatný status objednávky' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        updated_at: new Date()
      }
    });

    // Konvertovat BigInt na String před serializací
    const serializedOrder = JSON.parse(JSON.stringify(
      updatedOrder,
      (key, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value
    ));

    console.log('Order status updated successfully');

    // Nastavení hlaviček proti cachování
    return new NextResponse(JSON.stringify(serializedOrder), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Chyba při aktualizaci statusu objednávky' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}
