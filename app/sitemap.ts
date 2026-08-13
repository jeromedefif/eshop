import type { MetadataRoute } from 'next';
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
        ...products.map((product) => ({
            url: `${SITE_URL}${getProductPath(product)}`,
            changeFrequency: 'weekly' as const,
            priority: 0.7
        }))
    ];
}
