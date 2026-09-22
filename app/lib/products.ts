import type { Product, CreateProductInput, UpdateProductInput } from '@/types/database';
export class ProductError extends Error {}
export type DeleteProductResult = { mode: 'deleted' | 'archived'; message: string };
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) throw new ProductError(data.error || 'Operace s produktem selhala.');
  return data;
}
export const fetchProducts = (includeArchived = false) => request<Product[]>(`/api/products${includeArchived ? '?includeArchived=1' : ''}`);
export const createProduct = (product: CreateProductInput) => request<Product>('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
export const updateProduct = (id: string, updates: UpdateProductInput) => request<Product>('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...updates, id }) });
export const deleteProduct = (id: string) => request<DeleteProductResult>(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const updateProductStock = (id: string, in_stock: boolean) => updateProduct(id, { in_stock });
export const archiveProduct = (id: string) => updateProduct(id, { is_archived: true, in_stock: false });
export const restoreProduct = (id: string) => updateProduct(id, { is_archived: false });
