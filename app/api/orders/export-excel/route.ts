import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

// Pomocná funkce pro formátování objemu
function formatVolume(volume: string | number, category: string): string {
    if (category === 'PET') return 'balení';
    if (category === 'Dusík') return volume === 'maly' ? 'malý' : 'velký';
    return `${volume}L`;
}

export async function GET() {
    try {
        // Načtení pouze objednávek se statusem "pending" (čeká na vyřízení)
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

        // Příprava dat pro Excel
        const excelData = serializedOrders.flatMap(order => {
            return order.order_items.map(item => ({
                'Datum vytvoření': new Date(order.created_at).toLocaleDateString('cs'),
                'Zákazník': order.customer_name,
                'Firma': order.customer_company || '',
                'Produkt': item.product.name,
                'Množství': item.quantity,
                'Objem': formatVolume(item.volume, item.product.category),
                'Kategorie': item.product.category,
                'Poznámka': order.note || '',
                'Celkový objem': `${order.total_volume}L`
            }));
        });

        // Vytvoření Excel workbooku
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Objednávky');

        // Auto-size columns
        const colWidths = [
            { wch: 15 }, // Datum vytvoření
            { wch: 20 }, // Zákazník
            { wch: 20 }, // Firma
            { wch: 25 }, // Produkt
            { wch: 10 }, // Množství
            { wch: 10 }, // Objem
            { wch: 15 }, // Kategorie
            { wch: 30 }, // Poznámka
            { wch: 15 }  // Celkový objem
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

        // Nastavení názvu souboru s aktuálním datem
        const date = new Date().toISOString().split('T')[0];
        const filename = `objednavky-cekajici-na-vyrizeni-${date}.xlsx`;

        return new NextResponse(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=${filename}`
            }
        });
    } catch (error) {
        console.error('Error exporting orders to Excel:', error);
        return NextResponse.json(
            { error: 'Chyba při exportu objednávek do Excelu' },
            { status: 500 }
        );
    }
}
