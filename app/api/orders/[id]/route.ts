import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { status } = await request.json();

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

    return NextResponse.json(serializedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Chyba při aktualizaci statusu objednávky' },
      { status: 500 }
    );
  }
}
