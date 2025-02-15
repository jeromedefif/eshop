import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Product } from '@prisma/client';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: {
                name: 'asc'
            }
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
                in_stock: data.in_stock
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
                in_stock: data.in_stock
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
