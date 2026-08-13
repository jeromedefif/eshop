import { supabase } from '@/lib/supabase/client';
import { Product, CreateProductInput, UpdateProductInput } from '@/types/database';

export class ProductError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProductError';
    }
}

export type DeleteProductResult = {
    mode: 'deleted' | 'archived';
    message: string;
};

async function refreshPublicProductPages(): Promise<void> {
    try {
        const response = await fetch('/api/products/revalidate', { method: 'POST' });
        if (!response.ok) {
            console.warn('Public product cache revalidation failed:', response.status);
        }
    } catch (error) {
        // Uložení produktu už proběhlo. Dočasný problém s cache nesmí uživateli
        // nahlásit, že se produkt neuložil; nejpozději do hodiny se obnoví sám.
        console.warn('Public product cache revalidation failed:', error);
    }
}

export async function fetchProducts(includeArchived = false): Promise<Product[]> {
    let query = supabase
        .from('products')
        .select('*');

    if (!includeArchived) {
        query = query.eq('is_archived', false);
    }

    const { data, error } = await query
        .order('is_new', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('sort_priority', { ascending: false })
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

    await refreshPublicProductPages();

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

    await refreshPublicProductPages();

    return {
        ...data,
        id: data.id.toString()
    };
}

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (!error) {
        await refreshPublicProductPages();
        return {
            mode: 'deleted',
            message: 'Produkt byl smazán'
        };
    }

    // Produkt je použitý v objednávkách -> místo hard delete jej archivujeme.
    if (error.code === '23503') {
        const { error: archiveError } = await supabase
            .from('products')
            .update({
                is_archived: true,
                archived_at: new Date().toISOString(),
                in_stock: false
            })
            .eq('id', id);

        if (archiveError) {
            console.error('Error archiving product after FK constraint:', archiveError);
            throw new ProductError('Produkt je použit v objednávkách a nepodařilo se jej archivovat');
        }

        await refreshPublicProductPages();

        return {
            mode: 'archived',
            message: 'Produkt je použit v objednávkách, byl proto archivován a zákazníkům se již nezobrazuje.'
        };
    }

    console.error('Error deleting product:', error);
    throw new ProductError('Nepodařilo se smazat produkt');
}

export async function updateProductStock(id: string, in_stock: boolean): Promise<Product> {
    return updateProduct(id, { in_stock });
}

export async function archiveProduct(id: string): Promise<Product> {
    return updateProduct(id, {
        is_archived: true,
        archived_at: new Date().toISOString(),
        in_stock: false
    });
}

export async function restoreProduct(id: string): Promise<Product> {
    return updateProduct(id, {
        is_archived: false,
        archived_at: null
    });
}
