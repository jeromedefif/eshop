type Item = { product_name?: string | null; product_category?: string | null; product: { name: string; category: string } };

export function withOrderSnapshots<T extends { order_items: Item[] }>(order: T): T {
  return { ...order, order_items: order.order_items.map((item) => ({
    ...item,
    product: { ...item.product, name: item.product_name ?? item.product.name, category: item.product_category ?? item.product.category },
  })) };
}
