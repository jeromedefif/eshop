import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Product } from '@prisma/client';
import type { ProductColor, ProductSweetness } from '@/types/database';
import { PRODUCT_COLOR_OPTIONS, PRODUCT_SWEETNESS_OPTIONS, supportsProductAttributes } from '@/lib/product-config';

const validColors = new Set(PRODUCT_COLOR_OPTIONS.map((option) => option.value));
const validSweetness = new Set(PRODUCT_SWEETNESS_OPTIONS.map((option) => option.value));

function productAttributes(data: Record<string, unknown>) {
    if (!supportsProductAttributes(String(data.category || ''))) {
        return { product_color: null, sweetness: null };
    }

    return {
        product_color: typeof data.product_color === 'string' && validColors.has(data.product_color as ProductColor) ? data.product_color : null,
        sweetness: typeof data.sweetness === 'string' && validSweetness.has(data.sweetness as ProductSweetness) ? data.sweetness : null
    };
}

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: { is_archived: false },
            orderBy: [
                { is_new: 'desc' },
                { is_featured: 'desc' },
                { sort_priority: 'desc' },
                { name: 'asc' }
            ]
        });

        const serializedProducts = products.map((product: Product) => ({
            ...product,
            id: product.id.toString()
        }));

        return NextResponse.json(serializedProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json(
            { error: 'Chyba při načítání produktů' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const product = await prisma.product.create({
            data: {
                name: data.name,
                category: data.category,
                in_stock: data.in_stock,
                is_archived: data.is_archived ?? false,
                is_new: data.is_new ?? false,
                is_featured: data.is_featured ?? false,
                sort_priority: data.sort_priority ?? 0,
                min_order_qty: data.min_order_qty ?? 1,
                allowed_volumes: Array.isArray(data.allowed_volumes) ? data.allowed_volumes as string[] : [],
                ...productAttributes(data)
            }
        });

        return NextResponse.json({
            ...product,
            id: product.id.toString()
        });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json(
            { error: 'Chyba při vytváření produktu' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const product = await prisma.product.update({
            where: { id: BigInt(data.id) },
            data: {
                name: data.name,
                category: data.category,
                in_stock: data.in_stock,
                is_archived: data.is_archived,
                archived_at: data.is_archived ? new Date() : null,
                is_new: data.is_new,
                is_featured: data.is_featured,
                sort_priority: data.sort_priority,
                min_order_qty: data.min_order_qty,
                allowed_volumes: data.allowed_volumes as string[],
                ...productAttributes(data)
            }
        });

        return NextResponse.json({
            ...product,
            id: product.id.toString()
        });
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json(
            { error: 'Chyba při aktualizaci produktu' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) throw new Error('No ID provided');

        const product = await prisma.product.delete({
            where: { id: BigInt(id) }
        });

        return NextResponse.json({
            success: true,
            id: product.id.toString()
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json(
            { error: 'Chyba při mazání produktu' },
            { status: 500 }
        );
    }
}
