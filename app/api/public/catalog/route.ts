import { NextResponse } from 'next/server';
import { CATEGORY_DETAILS, PRODUCT_CATEGORIES, normalizeProductCategory } from '@/lib/product-config';
import { getProductPath } from '@/lib/product-slug';
import { getPublicProducts } from '@/lib/public-products';

const SITE_URL = 'https://www.beginy.cz';

export async function GET() {
    try {
        const products = await getPublicProducts();

        const categories = PRODUCT_CATEGORIES.map((category) => {
            const details = CATEGORY_DETAILS[category];
            const categoryProducts = products
                .filter((product) => normalizeProductCategory(product.category) === category)
                .map((product) => ({
                    id: product.id,
                    name: product.name,
                    url: `${SITE_URL}${getProductPath(product)}`,
                    inStock: product.in_stock,
                    isNew: product.is_new,
                    isFeatured: product.is_featured,
                    allowedVolumes: product.allowed_volumes
                }));

            return {
                slug: details.slug,
                name: category,
                description: details.description,
                url: `${SITE_URL}/produkty/kategorie/${details.slug}`,
                productCount: categoryProducts.length,
                products: categoryProducts
            };
        });

        return NextResponse.json(
            {
                source: `${SITE_URL}/produkty`,
                categories
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
                }
            }
        );
    } catch (error) {
        console.error('Public catalog API error:', error);
        return NextResponse.json({ error: 'Katalog se nepodařilo načíst' }, { status: 500 });
    }
}
