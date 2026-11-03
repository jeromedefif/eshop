import type { ProductColor, ProductSweetness } from '@/types/database';

export function interpretCatalogRequest(query: string) {
    const words = query.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    const colors: ProductColor[] = [];
    const sweetness: ProductSweetness[] = [];
    const categories: string[] = [];
    const fruitWine = /\bovocn\w*\s+vin\w*\b/.test(words);

    if (/\bbil\w*\b/.test(words)) colors.push('white');
    if (/\bcerven\w*\b/.test(words)) colors.push('red');
    if (/\bruzov\w*\b/.test(words)) colors.push('rose');
    if (/\bsuch\w*\b/.test(words)) sweetness.push('dry');
    if (/\bpolosuch\w*\b/.test(words)) sweetness.push('semi_dry');
    if (/\bpolosladk\w*\b/.test(words)) sweetness.push('semi_sweet');
    if (/\bsladk\w*\b/.test(words)) sweetness.push('sweet');

    if (/\bnapoj\w*\b/.test(words)) categories.push('Nápoje');
    if (/\bperliv\w*\b/.test(words)) categories.push('Perlivé');
    if (/\bburcak\w*\b/.test(words)) categories.push('Burčák');
    if (fruitWine) categories.push('Ovocné víno');
    else if (!categories.includes('Perlivé') && /\bvin(?:o|a|em|u|e|um|ech|y)?\b/.test(words)) categories.push('Víno');

    const newOnly = /\b(?:novink\w*|nov[eyao])\b/.test(words);
    const featuredOnly = /\b(?:akc(?:e|i|ni|nich|nim)|slev\w*|zlevnen\w*)\b/.test(words);
    const topOnly = /\b(?:top\s*10\b|nejprodavan\w*|nejobjednav\w*|bestseller\w*)/.test(words);
    const outOfStock = /\b(?:nejsou\s+skladem|neni\s+skladem|mimo\s+sklad|nedostupn\w*|vyprodan\w*)\b/.test(words);
    const inStock = !outOfStock && /\b(?:skladem|dostupn\w*|skladov\w*)\b/.test(words);

    if (categories.length > 1 || /\b(?:bez|krome|mimo|nechci|nikoli|ale)\b/.test(words)) {
        return { kind: 'clarify' } as const;
    }
    if (!categories.length && !colors.length && !sweetness.length && !newOnly && !featuredOnly && !topOnly && !inStock && !outOfStock) {
        return { kind: 'unknown' } as const;
    }
    return { kind: 'filters', category: categories[0] ?? 'Všechny', colors, sweetness, newOnly, featuredOnly, topOnly, inStock, outOfStock } as const;
}
