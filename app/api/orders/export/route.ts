import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

export async function GET() {
    try {
        // Načtení pouze objednávek se statusem "pending" (čeká na vyřízení)
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

        // Pokud nejsou žádné objednávky k exportu
        if (pendingOrders.length === 0) {
            return NextResponse.json(
                { message: 'Žádné objednávky ke zpracování' },
                { status: 200 }
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

        // Nastavení názvu souboru s aktuálním datem
        const date = new Date().toISOString().split('T')[0];
        const filename = `objednavky-cekajici-na-vyrizeni-${date}.csv`;

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=${filename}`
            }
        });
    } catch (error) {
        console.error('Error exporting orders:', error);
        return NextResponse.json(
            { error: 'Chyba při exportu objednávek' },
            { status: 500 }
        );
    }
}
