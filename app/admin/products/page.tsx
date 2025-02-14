'use client';

import { withAdminAuth } from '@/components/auth/withAdminAuth';
import AdminProducts from '@/components/AdminProducts';
import { useState, useEffect } from 'react';
import { Product } from '@/types/database';

const AdminProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setProducts(data);
            setError(null);
        } catch (error) {
            console.error('Error fetching products:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (product: Omit<Product, 'id'>) => {
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            if (!response.ok) throw new Error('Failed to add product');
            const newProduct = await response.json();
            setProducts(prev => [...prev, newProduct]);
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    };

    const handleUpdateProduct = async (product: Product) => {
        try {
            const response = await fetch('/api/products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            if (!response.ok) throw new Error('Failed to update product');
            const updatedProduct = await response.json();
            setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };

    const handleDeleteProduct = async (id: number) => {
        try {
            const response = await fetch(`/api/products?id=${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete product');
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center text-red-600">
                    <p>{error}</p>
                    <button
                        onClick={fetchProducts}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
            onProductsChange={fetchProducts}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
        />
    );
};

export default withAdminAuth(AdminProductsPage);
