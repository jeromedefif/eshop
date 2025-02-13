'use client';

import { withAdminAuth } from '@/components/auth/withAdminAuth';
import AdminProducts from '@/components/AdminProducts';
import { useState, useEffect } from 'react';
import { Product } from '@/types/database';

const AdminProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
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
            await fetchProducts();
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
            await fetchProducts();
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
            await fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

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
