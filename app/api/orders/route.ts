// app/api/orders/route.ts - kompletní verze s výběrem období
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

  // Získání parametru search pro vyhledávání
  const searchQuery = url.searchParams.get('search') || '';
  const hasSearch = searchQuery.trim().length > 0;

  // Filtrování podle userId
  const userId = url.searchParams.get('userId') || '';
  const hasUserFilter = userId.trim().length > 0;

  // NOVÉ: Získání parametru pro období (výchozí hodnota je 'month')
  const period = url.searchParams.get('period') || 'month';
  console.log('Selected period:', period);

  try {
    console.log(`Fetching orders: ${hasSearch ? 'with search' : 'all'}, ${hasUserFilter ? 'for specific user' : 'all users'}, period: ${period}`);

    // NOVÁ ČÁST: Výpočet data podle vybraného období
    let dateFilter: Date | null = null;

    if (period !== 'all') {
      dateFilter = new Date();

      switch (period) {
        case 'week':
          // Posledních 7 dnů
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'month':
          // Posledních 30 dnů (výchozí)
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
        case 'year':
          // Poslední rok
          dateFilter.setFullYear(dateFilter.getFullYear() - 1);
          break;
        default:
          // Výchozí je měsíc
          dateFilter.setDate(dateFilter.getDate() - 30);
      }

      dateFilter.setHours(0, 0, 0, 0); // Nastavíme na začátek dne
      console.log(`Fetching orders since: ${dateFilter.toISOString()}`);
    } else {
      console.log('Fetching all orders (no date filter)');
    }

    // Sestavení where podmínky pro Prisma
    let whereCondition: any = {};

    // Přidání filtru na datum, pokud není vybráno "vše"
    if (dateFilter) {
      whereCondition.created_at = {
        gte: dateFilter
      };
    }

    if (hasSearch) {
      // Pokud máme datum filter, musíme použít AND
      if (dateFilter) {
        whereCondition = {
          AND: [
            {
              created_at: {
                gte: dateFilter
              }
            },
            {
              OR: [
                { customer_name: { contains: searchQuery, mode: 'insensitive' } },
                { customer_email: { contains: searchQuery, mode: 'insensitive' } },
                { customer_company: { contains: searchQuery, mode: 'insensitive' } },
                { id: { contains: searchQuery, mode: 'insensitive' } }
              ]
            }
          ]
        };
      } else {
        // Pokud nemáme datum filter, stačí OR podmínka
        whereCondition = {
          OR: [
            { customer_name: { contains: searchQuery, mode: 'insensitive' } },
            { customer_email: { contains: searchQuery, mode: 'insensitive' } },
            { customer_company: { contains: searchQuery, mode: 'insensitive' } },
            { id: { contains: searchQuery, mode: 'insensitive' } }
          ]
        };
      }
    }

    // Přidání podmínky pro filtrování podle userId
    if (hasUserFilter) {
      if (whereCondition.AND) {
        whereCondition.AND.push({ user_id: userId });
      } else if (whereCondition.OR) {
        // Pokud máme OR podmínku, musíme ji zabalit do AND
        whereCondition = {
          AND: [
            { OR: whereCondition.OR },
            { user_id: userId }
          ]
        };
      } else {
        whereCondition = {
          ...whereCondition,
          user_id: userId
        };
      }
    }

    // Získání objednávek podle filtru
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

    console.log(`Successfully fetched ${orders.length} orders for period: ${period}`);

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
