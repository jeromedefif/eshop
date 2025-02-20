// app/admin/products/page.tsx
'use client';

import { withAdminAuth } from '@/components/auth/withAdminAuth';
import AdminProducts from '@/components/AdminProducts';
import { useState, useEffect, useCallback } from 'react';
import { Product, CreateProductInput } from '@/types/database';
import {
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    ProductError
} from '@/lib/products';

const AdminProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchProducts();
            setProducts(data);
            setError(null);
        } catch (error) {
            console.error('Error loading products:', error);
            setError(
                error instanceof ProductError
                    ? error.message
                    : 'Nepodařilo se načíst produkty'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAddProduct = async (productData: CreateProductInput) => {
        try {
            const newProduct = await createProduct(productData);
            setProducts(prev => [...prev, newProduct]);
            return newProduct;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error instanceof ProductError
                ? error
                : new ProductError('Nepodařilo se přidat produkt');
        }
    };

    const handleUpdateProduct = async (product: Product) => {
        try {
            const { id, ...updates } = product;
            const updatedProduct = await updateProduct(id, updates);
            setProducts(prev =>
                prev.map(p => p.id === id ? updatedProduct : p)
            );
            return updatedProduct;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error instanceof ProductError
                ? error
                : new ProductError('Nepodařilo se aktualizovat produkt');
        }
    };

    const handleDeleteProduct = async (id: string) => {
        try {
            await deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error instanceof ProductError
                ? error
                : new ProductError('Nepodařilo se smazat produkt');
        }
    };

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => loadProducts()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Zkusit znovu
                    </button>
                </div>
            </div>
        );
    }

    if (loading && products.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Načítání produktů...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminProducts
            products={products}
            onProductsChange={loadProducts}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
        />
    );
};

export default withAdminAuth(AdminProductsPage);
