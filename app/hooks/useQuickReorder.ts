'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase/client';
import { getAllowedVolumes } from '@/lib/product-config';

export function useQuickReorder() {
  const router = useRouter();
  const { user } = useAuth();
  const { setCartItems } = useCart();

  return useCallback(async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          order_items (
            id,
            product_id,
            volume,
            quantity,
            product:products (
              id,
              name,
              category,
              in_stock,
              is_archived,
              min_order_qty,
              allowed_volumes
            )
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      const latestOrder = data?.[0];
      if (!latestOrder) {
        alert('Nemáte žádnou předchozí objednávku k opakování.');
        return;
      }

      const nextCartItems: Record<string, number> = {};
      let unavailableItems = 0;

      latestOrder.order_items.forEach((item: any) => {
        if (
          !item.product?.in_stock ||
          item.product?.is_archived ||
          !getAllowedVolumes(item.product).includes(String(item.volume))
        ) {
          unavailableItems += 1;
          return;
        }

        const key = `${item.product_id}-${item.volume}`;
        nextCartItems[key] = Math.max(item.quantity, item.product.min_order_qty || 1);
      });

      if (Object.keys(nextCartItems).length === 0) {
        alert('Poslední objednávka obsahuje pouze nedostupné položky.');
        return;
      }

      setCartItems(nextCartItems);

      if (unavailableItems > 0) {
        alert('Některé položky nebyly skladem a nebyly přidány.');
      }

      router.push('/order-summary');
    } catch (error) {
      console.error('Error creating reorder from latest order:', error);
      alert('Objednávku se nepodařilo načíst. Zkuste to prosím znovu.');
    }
  }, [router, setCartItems, user]);
}
