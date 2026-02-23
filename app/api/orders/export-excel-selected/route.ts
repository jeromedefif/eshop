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

function normalizeCategory(category: string): string {
  if (category === 'Dusík' || category === 'Plyny') return 'Plyny';
  return category;
}

function categoryRank(category: string): number {
  const order = ['Nápoje', 'Víno', 'Ovocné víno', 'Plyny', 'PET'];
  const idx = order.indexOf(category);
  return idx === -1 ? 999 : idx;
}

function getVolumeSortValue(volume: string | number): number {
  const normalized = String(volume || '').toLowerCase().trim();
  const numberMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1].replace(',', '.'));
  }
  if (normalized.includes('velk')) return 2;
  if (normalized.includes('mal')) return 1;
  if (normalized.includes('balen')) return 0;
  return -1;
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

    const ordersSorted = [...serializedOrders].sort((a: any, b: any) => {
      // 1) Podle data vytvoření (nejnovější první)
      const byDate = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (byDate !== 0) return byDate;

      // 2) Podle názvu zákazníka
      const byCustomer = String(a.customer_name || '').localeCompare(String(b.customer_name || ''), 'cs');
      if (byCustomer !== 0) return byCustomer;

      // 3) Stabilizace podle ID
      return String(a.id).localeCompare(String(b.id), 'cs');
    });

    const excelData = ordersSorted.flatMap((order: any) => {
      const itemsSorted = [...(order.order_items || [])].sort((a: any, b: any) => {
        const categoryA = normalizeCategory(a?.product?.category || 'Ostatní');
        const categoryB = normalizeCategory(b?.product?.category || 'Ostatní');

        // V rámci objednávky podle řazení z detailu objednávky
        const byCategory = categoryRank(categoryA) - categoryRank(categoryB);
        if (byCategory !== 0) return byCategory;

        const byVolume = getVolumeSortValue(b.volume) - getVolumeSortValue(a.volume);
        if (byVolume !== 0) return byVolume;

        const byQuantity = Number(b.quantity || 0) - Number(a.quantity || 0);
        if (byQuantity !== 0) return byQuantity;

        return String(a?.product?.name || '').localeCompare(String(b?.product?.name || ''), 'cs');
      });

      return itemsSorted.map((item: any) => ({
        'Datum': new Date(order.created_at).toLocaleDateString('cs-CZ'),
        'Zákazník': order.customer_name,
        'Produkt': item.product.name,
        'ks': item.quantity,
        'Objem': formatVolume(item.volume, item.product.category),
        'Kategorie': normalizeCategory(item.product.category),
        'Poznámka': order.note || '',
        'CLK': `${order.total_volume}L`
      }));
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vybrané objednávky');

    const colWidths = [
      { wch: 14 }, // Datum
      { wch: 28 }, // Zákazník
      { wch: 46 }, // Produkt
      { wch: 8 },  // ks
      { wch: 10 }, // Objem
      { wch: 14 }, // Kategorie
      { wch: 36 }, // Poznámka
      { wch: 10 }  // CLK
    ];
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
