import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Zakázání cachování pro tento endpoint
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Pomocná funkce pro formátování objemu
function formatVolume(volume: string | number, category: string): string {
    if (category === 'PET') return 'balení';
    if (category === 'Dusík') return volume === 'maly' ? 'malý' : 'velký';
    return `${volume}L`;
}

// Funkce pro escapování hodnoty v CSV
function escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Pokud hodnota obsahuje čárku, uvozovky nebo nový řádek, obalit uvozovkami a zdvojit uvozovky uvnitř
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export async function GET(request: Request) {
    console.log('Export CSV API called at', new Date().toISOString());

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

        // Načtení pouze objednávek se statusem "pending" (čeká na vyřízení)
        console.log('Fetching all pending orders...');

        // Nejprve kontrolní dotaz na všechny stavy objednávek pro diagnostiku
        const statusCounts = await prisma.$queryRaw`
            SELECT status, COUNT(*) as count
            FROM "orders"
            GROUP BY status
        `;
        console.log('Order status counts:', statusCounts);

        // Vlastní dotaz pro export
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: 'pending' // Filtrujeme pouze objednávky čekající na vyřízení
            },
            include: {
                order_items: {
                    include: {
                        product: true // Včetně informací o produktu
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

        // Vytvoření hlavičky CSV
        const csvHeader = [
            'Datum vytvoření',
            'Zákazník',
            'Firma',
            'Produkt',
            'Množství',
            'Objem',
            'Kategorie',
            'Poznámka',
            'Celkový objem'
        ].map(escapeCsvValue).join(',');

        // Vytvoření řádků CSV
        const csvRows = serializedOrders.flatMap(order => {
            // Pro každou položku v objednávce vytvoříme jeden řádek
            return order.order_items.map(item => [
                new Date(order.created_at).toLocaleDateString('cs'),
                order.customer_name,
                order.customer_company || '',
                item.product.name,
                item.quantity,
                formatVolume(item.volume, item.product.category),
                item.product.category,
                order.note || '',
                `${order.total_volume}L`
            ].map(escapeCsvValue).join(','));
        });

        // Sestavení obsahu CSV
        const csvContent = [csvHeader, ...csvRows].join('\n');
        console.log(`CSV generated with ${csvRows.length} rows`);

        // Nastavení názvu souboru s aktuálním datem
        const date = new Date().toISOString().split('T')[0];
        const filename = `objednavky-cekajici-na-vyrizeni-${date}.csv`;

        // Vrácení odpovědi s explicitními anti-cache hlavičkami
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=${filename}`,
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('Error exporting orders to CSV:', error);
        return NextResponse.json(
            {
                error: 'Chyba při exportu objednávek',
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
