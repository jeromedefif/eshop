import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

// Zakázání cachování pro tento endpoint
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Pomocná funkce pro formátování objemu
function formatVolume(volume: string | number, category: string): string {
    if (category === 'PET') return 'balení';
    if (category === 'Dusík' || category === 'Plyny') return volume === 'maly' ? 'malý' : 'velký';
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

export async function GET(request: Request) {
    console.log('Export Excel API called at', new Date().toISOString());

    // Získání URL parametrů (pokud existují)
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('t') || Date.now();
    console.log('Request timestamp:', timestamp);

    try {
        // Nejprve ověříme, zda můžeme vůbec číst z databáze
        console.log('Testing database connection...');
        try {
            const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
            console.log('Database connection test:', testQuery);
        } catch (testError) {
            console.error('Database connection test failed:', testError);
        }

        // Nejprve kontrolní dotaz na všechny stavy objednávek pro diagnostiku
        const statusCounts = await prisma.$queryRaw`
            SELECT status, COUNT(*) as count
            FROM "orders"
            GROUP BY status
        `;
        console.log('Order status counts:', statusCounts);

        // Načtení pouze objednávek se statusem "pending" (čeká na vyřízení)
        console.log('Fetching all pending orders...');
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: 'pending'
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

        console.log(`Found ${pendingOrders.length} pending orders for export`);

        // Pokud nejsou žádné objednávky k exportu
        if (pendingOrders.length === 0) {
            console.log('No pending orders found for export');
            return NextResponse.json(
                { message: 'Žádné objednávky ke zpracování' },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'no-store, max-age=0, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                }
            );
        }

        // Serializace BigInt
        const serializedOrders = JSON.parse(JSON.stringify(
            pendingOrders,
            (key, value) => typeof value === 'bigint' ? value.toString() : value
        ));

        const ordersSorted = [...serializedOrders].sort((a, b) => {
            const byDate = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (byDate !== 0) return byDate;

            const byCustomer = String(a.customer_name || '').localeCompare(String(b.customer_name || ''), 'cs');
            if (byCustomer !== 0) return byCustomer;

            return String(a.id).localeCompare(String(b.id), 'cs');
        });

        // Příprava dat pro Excel
        const excelData = ordersSorted.flatMap(order => {
            const itemsSorted = [...(order.order_items || [])].sort((a, b) => {
                const categoryA = normalizeCategory(a?.product?.category || 'Ostatní');
                const categoryB = normalizeCategory(b?.product?.category || 'Ostatní');

                const byCategory = categoryRank(categoryA) - categoryRank(categoryB);
                if (byCategory !== 0) return byCategory;

                const byVolume = getVolumeSortValue(b.volume) - getVolumeSortValue(a.volume);
                if (byVolume !== 0) return byVolume;

                const byQuantity = Number(b.quantity || 0) - Number(a.quantity || 0);
                if (byQuantity !== 0) return byQuantity;

                return String(a?.product?.name || '').localeCompare(String(b?.product?.name || ''), 'cs');
            });

            return itemsSorted.map(item => ({
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

        console.log(`Excel data prepared with ${excelData.length} rows`);

        // Vytvoření Excel workbooku
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Objednávky');

        // Auto-size columns
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

        // Nastavení hlavičky (tučné písmo)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:I1');
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellRef]) continue;
            worksheet[cellRef].s = { font: { bold: true } };
        }

        // Generování Buffer z Excel workbooku
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        console.log('Excel buffer generated');

        // Nastavení názvu souboru s aktuálním datem
        const date = new Date().toISOString().split('T')[0];
        const filename = `objednavky-cekajici-na-vyrizeni-${date}.xlsx`;

        // Vrácení odpovědi s explicitními anti-cache hlavičkami
        return new NextResponse(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=${filename}`,
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('Error exporting orders to Excel:', error);
        return NextResponse.json(
            {
                error: 'Chyba při exportu objednávek do Excelu',
                details: error instanceof Error ? error.message : 'Unknown error'
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
