import { supabase } from '@/lib/supabase/client';
import { Product, CreateProductInput, UpdateProductInput } from '@/types/database';

export class ProductError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProductError';
    }
}

export async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        throw new ProductError('Nepodařilo se načíst produkty');
    }

    return data?.map(product => ({
        ...product,
        id: product.id.toString()
    })) || [];
}

export async function createProduct(product: CreateProductInput): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
        throw new ProductError('Nepodařilo se vytvořit produkt');
    }

    if (!data) {
        throw new ProductError('Nepodařilo se vytvořit produkt - žádná data');
    }

    return {
        ...data,
        id: data.id.toString()
    };
}

export async function updateProduct(id: string, updates: UpdateProductInput): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating product:', error);
        throw new ProductError('Nepodařilo se aktualizovat produkt');
    }

    if (!data) {
        throw new ProductError('Nepodařilo se aktualizovat produkt - žádná data');
    }

    return {
        ...data,
        id: data.id.toString()
    };
}

export async function deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting product:', error);
        throw new ProductError('Nepodařilo se smazat produkt');
    }
}

export async function updateProductStock(id: string, in_stock: boolean): Promise<Product> {
    return updateProduct(id, { in_stock });
}
