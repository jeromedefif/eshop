import { supabase } from './supabase'
import { Product } from '../types/database'

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data || []
}

export async function updateProductStock(id: number, inStock: boolean) {
  const { error } = await supabase
    .from('products')
    .update({ in_stock: inStock })
    .eq('id', id)

  if (error) {
    console.error('Error updating product:', error)
    return false
  }

  return true
}
