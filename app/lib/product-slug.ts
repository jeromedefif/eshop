export function slugifyProductName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('cs-CZ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'produkt';
}

export function getProductSlug(product: { id: string | number | bigint; name: string }): string {
    return `${slugifyProductName(product.name)}-${String(product.id)}`;
}

export function getProductPath(product: { id: string | number | bigint; name: string }): string {
    return `/produkty/${getProductSlug(product)}`;
}

export function getProductIdFromSlug(slug: string): string | null {
    const match = slug.match(/-(\d+)$/);
    return match?.[1] || null;
}
