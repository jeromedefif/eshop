import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';

export type PublicProduct = {
    id: string;
    name: string;
    category: string;
    in_stock: boolean;
    is_new: boolean;
    is_featured: boolean;
    allowed_volumes: string[];
};

export const getPublicProducts = unstable_cache(
    async (): Promise<PublicProduct[]> => {
        const products = await prisma.product.findMany({
            where: { is_archived: false },
            select: {
                id: true,
                name: true,
                category: true,
                in_stock: true,
                is_new: true,
                is_featured: true,
                allowed_volumes: true
            },
            orderBy: { name: 'asc' }
        });

        return products.map((product) => ({
            ...product,
            id: product.id.toString()
        }));
    },
    ['public-products-catalog'],
    { revalidate: 3600, tags: ['public-products'] }
);

export const getPublicProductById = unstable_cache(
    async (id: string): Promise<PublicProduct | null> => {
        if (!/^\d+$/.test(id)) return null;

        const product = await prisma.product.findFirst({
            where: {
                id: BigInt(id),
                is_archived: false
            },
            select: {
                id: true,
                name: true,
                category: true,
                in_stock: true,
                is_new: true,
                is_featured: true,
                allowed_volumes: true
            }
        });

        return product ? { ...product, id: product.id.toString() } : null;
    },
    ['public-product-by-id'],
    { revalidate: 3600, tags: ['public-products'] }
);

export const getPublicProductsForSitemap = unstable_cache(
    async (): Promise<Array<{ id: string; name: string }>> => {
        const products = await prisma.product.findMany({
            where: { is_archived: false },
            select: { id: true, name: true },
            orderBy: { id: 'asc' }
        });

        return products.map((product) => ({
            id: product.id.toString(),
            name: product.name
        }));
    },
    ['public-products-sitemap'],
    { revalidate: 3600, tags: ['public-products'] }
);
