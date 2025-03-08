// app/api/orders/route.ts - zjednodušená verze bez paginace
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Přidáváme definici, která zakazuje caching pro tento endpoint
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: Request) {
  console.log('Admin orders API called at', new Date().toISOString());

  // Získání URL parametrů (pokud existují)
  const url = new URL(request.url);
  const timestamp = url.searchParams.get('t') || Date.now();
  console.log('Request timestamp:', timestamp);

  // Získání parametru search pro vyhledávání (ponecháme pro případné budoucí využití)
  const searchQuery = url.searchParams.get('search') || '';
  const hasSearch = searchQuery.trim().length > 0;

  // Přidáno: Filtrování podle userId (ponecháme pro detail uživatele)
  const userId = url.searchParams.get('userId') || '';
  const hasUserFilter = userId.trim().length > 0;

  try {
    console.log(`Fetching orders: ${hasSearch ? 'with search' : 'all'}, ${hasUserFilter ? 'for specific user' : 'all users'}`);

    // Sestavení where podmínky pro Prisma
    let whereCondition: any = {};

    if (hasSearch) {
      // Použijeme Prisma OR pro vyhledávání
      whereCondition = {
        OR: [
          { customer_name: { contains: searchQuery, mode: 'insensitive' } },
          { customer_email: { contains: searchQuery, mode: 'insensitive' } },
          { customer_company: { contains: searchQuery, mode: 'insensitive' } },
          { id: { contains: searchQuery, mode: 'insensitive' } }
        ]
      };
    }

    // Přidání podmínky pro filtrování podle userId
    if (hasUserFilter) {
      whereCondition = {
        ...whereCondition,
        user_id: userId
      };
    }

    // Získání objednávek bez paginace
    const orders = await prisma.order.findMany({
      where: whereCondition,
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

    console.log(`Successfully fetched ${orders.length} orders`);

    // Konvertujeme BigInt na string před serializací
    const serializedOrders = JSON.parse(JSON.stringify(
      orders,
      (key, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value
    ));

    // Nastavení hlaviček proti cachování
    return new NextResponse(JSON.stringify(serializedOrders), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání objednávek' },
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
