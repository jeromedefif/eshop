import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// Zakázat caching pro dynamická data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET endpoint pro získání detailu objednávky podle ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Fetch order detail API called', new Date().toISOString(), 'for orderId:', params.id);

  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        order_items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      );
    }

    // Konvertovat BigInt na String před serializací
    const serializedOrder = JSON.parse(JSON.stringify(
      order,
      (key, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value
    ));

    console.log('Order fetched successfully');

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
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání objednávky' },
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

// PATCH endpoint pro aktualizaci statusu objednávky
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

// DELETE endpoint pro smazání objednávky včetně všech jejích položek
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Delete order API called', new Date().toISOString(), 'for orderId:', params.id);

  try {
    const { id } = params;

    // Nejprve ověříme, zda objednávka existuje
    const orderExists = await prisma.order.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!orderExists) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      );
    }

    // Využijeme transakce pro zajištění, že se buď smaže vše, nebo nic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Nejprve smažeme všechny položky objednávky (order_items)
      const deletedItems = await tx.orderItem.deleteMany({
        where: { order_id: id }
      });

      console.log(`Deleted ${deletedItems.count} order items for order ${id}`);

      // 2. Nyní smažeme samotnou objednávku
      const deletedOrder = await tx.order.delete({
        where: { id }
      });

      return { items: deletedItems.count, order: deletedOrder };
    });

    console.log(`Order ${id} has been successfully deleted with all its items`);

    // Konvertovat BigInt na String před serializací
    const serializedResult = JSON.parse(JSON.stringify(
      result,
      (key, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value
    ));

    // Nastavení hlaviček proti cachování
    return new NextResponse(JSON.stringify({
      success: true,
      message: 'Objednávka byla úspěšně smazána',
      deletedItems: serializedResult.items,
      deletedOrder: serializedResult.order
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error deleting order:', error);

    // Poskytnutí podrobnějších informací o chybě pro snazší ladění
    let errorMessage = 'Chyba při mazání objednávky';
    let errorDetails = 'Neznámá chyba';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || 'Bez detailů';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails
      },
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
