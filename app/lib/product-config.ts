import type { Product } from '@/types/database';

export const PRODUCT_CATEGORIES = ['Víno', 'Perlivé', 'Nápoje', 'Ovocné víno', 'Burčák', 'Plyny', 'PET'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_DETAILS: Record<ProductCategory, { slug: string; description: string }> = {
    'Víno': {
        slug: 'vino',
        description: 'Velkoobchodní nabídka vín pro vinotéky, gastronomii a další profesionální odběratele.'
    },
    'Perlivé': {
        slug: 'perlive',
        description: 'Perlivá a sycená vína určená pro velkoobchodní odběr a gastronomické provozy.'
    },
    'Nápoje': {
        slug: 'napoje',
        description: 'Velkoobchodní sortiment nápojů v praktických objemech pro profesionální odběratele.'
    },
    'Ovocné víno': {
        slug: 'ovocne-vino',
        description: 'Ovocná vína a nápoje dostupné ve více variantách balení pro B2B zákazníky.'
    },
    'Burčák': {
        slug: 'burcak',
        description: 'Sezónní nabídka burčáku pro vinotéky, gastronomii a další velkoobchodní zákazníky.'
    },
    'Plyny': {
        slug: 'plyny',
        description: 'Technické a potravinářské plyny v lahvích pro provozy a profesionální odběratele.'
    },
    'PET': {
        slug: 'pet',
        description: 'PET lahve a související obalový materiál pro stáčení a distribuci nápojů.'
    }
};

export const CATEGORY_ORDER = ['Víno', 'Perlivé', 'Nápoje', 'Ovocné víno', 'Burčák', 'Plyny', 'PET'];

export const LITER_VOLUMES = ['3', '5', '10', '20', '30', '50'];
export const BURCAK_VOLUMES = ['3', '5', '10', '20', '25', '50'];
export const GAS_VOLUMES = ['maly', 'velky'];
export const PACKAGE_VOLUMES = ['baleni'];

export function normalizeProductCategory(category: string): string {
    return category === 'Dusík' ? 'Plyny' : category;
}

export function getCategoryDetails(category: string) {
    const normalized = normalizeProductCategory(category) as ProductCategory;
    return CATEGORY_DETAILS[normalized] || null;
}

export function getCategoryBySlug(slug: string): ProductCategory | null {
    return PRODUCT_CATEGORIES.find((category) => CATEGORY_DETAILS[category].slug === slug) || null;
}

export function getCategoryPath(category: string): string {
    const details = getCategoryDetails(category);
    return details ? `/produkty/kategorie/${details.slug}` : '/produkty';
}

export function getDefaultAllowedVolumes(category: string): string[] {
    switch (normalizeProductCategory(category)) {
        case 'Víno':
        case 'Perlivé':
        case 'Nápoje':
        case 'Ovocné víno':
            return LITER_VOLUMES;
        case 'Burčák':
            return BURCAK_VOLUMES;
        case 'Plyny':
            return GAS_VOLUMES;
        case 'PET':
            return PACKAGE_VOLUMES;
        default:
            return [];
    }
}

export function getAllowedVolumes(product: Pick<Product, 'category' | 'allowed_volumes'>): string[] {
    const volumes = product.allowed_volumes?.length
        ? product.allowed_volumes
        : getDefaultAllowedVolumes(product.category);

    // Existing Burčák products can still contain the former 30L value until
    // the data migration is applied. Keep the UI and validation consistent.
    if (normalizeProductCategory(product.category) === 'Burčák') {
        const currentVolumes = volumes.map((volume) => volume === '30' ? '25' : volume);
        const uniqueVolumes = new Set([...currentVolumes, '25']);
        return [
            ...BURCAK_VOLUMES.filter((volume) => uniqueVolumes.has(volume)),
            ...Array.from(uniqueVolumes).filter((volume) => !BURCAK_VOLUMES.includes(volume))
        ];
    }

    return volumes;
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
