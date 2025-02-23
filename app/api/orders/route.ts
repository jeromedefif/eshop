import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      console.error('User is not admin:', session.user.id);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
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

    const serializedOrders = JSON.parse(JSON.stringify(
      orders,
      (key, value) => typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(serializedOrders);
  } catch (error) {
    console.error('Error in orders API:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání objednávek', details: error.message },
      { status: 500 }
    );
  }
}
