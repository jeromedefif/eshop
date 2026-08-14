import type { MetadataRoute } from 'next';
import { CATEGORY_DETAILS, PRODUCT_CATEGORIES } from '@/lib/product-config';
import { getProductPath } from '@/lib/product-slug';
import { getPublicProductsForSitemap } from '@/lib/public-products';

const SITE_URL = 'https://www.beginy.cz';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const products = await getPublicProductsForSitemap();

    return [
        {
            url: SITE_URL,
            changeFrequency: 'weekly',
            priority: 1
        },
        {
            url: `${SITE_URL}/produkty`,
            changeFrequency: 'weekly',
            priority: 0.9
        },
        ...PRODUCT_CATEGORIES.map((category) => ({
            url: `${SITE_URL}/produkty/kategorie/${CATEGORY_DETAILS[category].slug}`,
            changeFrequency: 'weekly' as const,
            priority: 0.8
        })),
        ...products.map((product) => ({
            url: `${SITE_URL}${getProductPath(product)}`,
            changeFrequency: 'weekly' as const,
            priority: 0.7
        }))
    ];
}
