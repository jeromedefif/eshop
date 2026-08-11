import type { Product } from '@/types/database';

export const PRODUCT_CATEGORIES = ['Nápoje', 'Víno', 'Ovocné víno', 'Plyny', 'PET', 'Lahve'] as const;

export const CATEGORY_ORDER = ['Nápoje', 'Víno', 'Ovocné víno', 'Plyny', 'PET', 'Lahve'];

export const LITER_VOLUMES = ['3', '5', '10', '20', '30', '50'];
export const GAS_VOLUMES = ['maly', 'velky'];
export const PACKAGE_VOLUMES = ['baleni'];

export function normalizeProductCategory(category: string): string {
    return category === 'Dusík' ? 'Plyny' : category;
}

export function getDefaultAllowedVolumes(category: string): string[] {
    switch (normalizeProductCategory(category)) {
        case 'Víno':
        case 'Nápoje':
        case 'Ovocné víno':
            return LITER_VOLUMES;
        case 'Plyny':
            return GAS_VOLUMES;
        case 'PET':
        case 'Lahve':
            return PACKAGE_VOLUMES;
        default:
            return [];
    }
}

export function getAllowedVolumes(product: Pick<Product, 'category' | 'allowed_volumes'>): string[] {
    return product.allowed_volumes?.length
        ? product.allowed_volumes
        : getDefaultAllowedVolumes(product.category);
}

export function isVolumeAllowed(product: Pick<Product, 'category' | 'allowed_volumes'>, volume: string | number): boolean {
    return getAllowedVolumes(product).includes(String(volume));
}

export function sortCatalogProducts(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
        if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        if (a.sort_priority !== b.sort_priority) return b.sort_priority - a.sort_priority;
        return a.name.localeCompare(b.name, 'cs');
    });
}
