// app/api/orders/route.ts
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

  // Parametry pro stránkování
  const page = parseInt(url.searchParams.get('page') || '0');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '13');
  const skip = page * pageSize;

  // Získání parametru search pro vyhledávání
  const searchQuery = url.searchParams.get('search') || '';
  const hasSearch = searchQuery.trim().length > 0;

  try {
    console.log(`Fetching orders with pagination: page=${page}, pageSize=${pageSize}, search=${searchQuery}`);

    // Získáme celkový počet objednávek (pro určení, zda máme další stránky)
    let totalOrdersCount = 0;

    if (hasSearch) {
      // Pokud máme vyhledávání, potřebujeme zjistit počet všech odpovídajících objednávek
      const searchPattern = `%${searchQuery}%`;
      const countResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "orders"
        WHERE "customer_name" ILIKE ${searchPattern}
        OR "customer_email" ILIKE ${searchPattern}
        OR "id"::text ILIKE ${searchPattern}
        OR "customer_company" ILIKE ${searchPattern}
      `;
      totalOrdersCount = Number(countResult[0].count);
    } else {
      // Pokud nemáme vyhledávání, zjistíme celkový počet objednávek
      totalOrdersCount = await prisma.order.count();
    }

    console.log(`Total matching orders: ${totalOrdersCount}`);

    // Sestavení dotazu na objednávky s ohledem na vyhledávání a stránkování
    let orders;

    if (hasSearch) {
      // Pro vyhledávání použijeme raw SQL dotaz pro lepší kontrolu nad vyhledáváním
      const searchPattern = `%${searchQuery}%`;
      orders = await prisma.$queryRaw`
        SELECT * FROM "orders"
        WHERE "customer_name" ILIKE ${searchPattern}
        OR "customer_email" ILIKE ${searchPattern}
        OR "id"::text ILIKE ${searchPattern}
        OR "customer_company" ILIKE ${searchPattern}
        ORDER BY "created_at" DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `;

      // Načtení položek objednávek pro vyhledané objednávky
      const orderIds = orders.map((order: any) => order.id);

      if (orderIds.length > 0) {
        const orderItems = await prisma.orderItem.findMany({
          where: {
            order_id: { in: orderIds }
          },
          include: {
            product: true
          }
        });

        // Přiřazení položek k objednávkám
        orders = orders.map((order: any) => ({
          ...order,
          order_items: orderItems.filter((item: any) => item.order_id === order.id)
        }));
      }
    } else {
      // Pro běžné načítání použijeme standardní Prisma API
      orders = await prisma.order.findMany({
        include: {
          order_items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: pageSize
      });
    }

    console.log(`Successfully fetched ${orders.length} orders for page ${page}`);

    // Konvertujeme BigInt na string před serializací
    const serializedOrders = JSON.parse(JSON.stringify(
      orders,
      (key, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value
    ));

    // Nastavení hlaviček proti cachování a přidání informací o stránkování
    return new NextResponse(JSON.stringify({
      orders: serializedOrders,
      pagination: {
        page,
        pageSize,
        totalOrders: totalOrdersCount,
        hasMore: (page + 1) * pageSize < totalOrdersCount
      }
    }), {
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
