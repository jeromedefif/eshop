import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

function formatVolume(volume: string | number, category: string): string {
  if (category === 'PET') return 'balení';
  if (category === 'Dusík' || category === 'Plyny') {
    return String(volume) === 'maly' ? 'malý' : 'velký';
  }
  return `${volume}L`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderIds = Array.isArray(body?.orderIds)
      ? body.orderIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (!orderIds.length) {
      return NextResponse.json(
        { error: 'Nebyla vybrána žádná objednávka k exportu.' },
        { status: 400 }
      );
    }

    const selectedOrders = await prisma.order.findMany({
      where: {
        id: { in: orderIds }
      },
      include: {
        order_items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!selectedOrders.length) {
      return NextResponse.json(
        { error: 'Vybrané objednávky nebyly nalezeny.' },
        { status: 404 }
      );
    }

    const serializedOrders = JSON.parse(JSON.stringify(
      selectedOrders,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value)
    ));

    const excelData = serializedOrders.flatMap((order: any) => (
      order.order_items.map((item: any) => ({
        'ID objednávky': order.id,
        'Datum vytvoření': new Date(order.created_at).toLocaleString('cs-CZ'),
        'Stav': order.status,
        'Zákazník': order.customer_name,
        'Firma': order.customer_company || '',
        'Email': order.customer_email,
        'Telefon': order.customer_phone || '',
        'Produkt': item.product.name,
        'Množství': item.quantity,
        'Objem': formatVolume(item.volume, item.product.category),
        'Kategorie': item.product.category,
        'Poznámka': order.note || '',
        'Celkový objem': `${order.total_volume}L`
      }))
    ));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vybrané objednávky');

    const colWidths = Object.keys(excelData[0] || {}).map((key) => ({ wch: Math.max(key.length, 16) }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().split('T')[0];

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=objednavky-vybrane-${date}.xlsx`,
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    });
  } catch (error) {
    console.error('Error exporting selected orders to Excel:', error);
    return NextResponse.json(
      {
        error: 'Chyba při exportu vybraných objednávek do Excelu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
