import type { ProductColor, ProductSweetness } from '@/types/database';

export function normalizeCatalogSearch(value: string) {
    return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function interpretCatalogRequest(query: string) {
    const words = normalizeCatalogSearch(query);
    let remaining = words;
    const consume = (pattern: RegExp) => {
        const matched = pattern.test(words);
        if (matched) remaining = remaining.replace(new RegExp(pattern.source, 'g'), ' ');
        return matched;
    };
    const colors: ProductColor[] = [];
    const sweetness: ProductSweetness[] = [];
    const categories: string[] = [];
    const fruitWine = consume(/\bovocn\w*\s+vin\w*\b/);

    if (consume(/\bbil\w*\b/)) colors.push('white');
    if (consume(/\bcerven\w*\b/)) colors.push('red');
    if (consume(/\bruzov\w*\b/)) colors.push('rose');
    if (consume(/\bsuch\w*\b/)) sweetness.push('dry');
    if (consume(/\bpolosuch\w*\b/)) sweetness.push('semi_dry');
    if (consume(/\bpolosladk\w*\b/)) sweetness.push('semi_sweet');
    if (consume(/\bsladk\w*\b/)) sweetness.push('sweet');

    if (consume(/\bnapoj\w*\b/)) categories.push('Nápoje');
    if (consume(/\bperliv\w*\b/)) categories.push('Perlivé');
    if (consume(/\bburcak\w*\b/)) categories.push('Burčák');
    if (fruitWine) categories.push('Ovocné víno');
    else if (!categories.includes('Perlivé') && consume(/\bvin(?:o|a|em|u|e|um|ech|y)?\b/)) categories.push('Víno');

    const newOnly = consume(/\b(?:novink\w*|nov[eyao])\b/);
    const featuredOnly = consume(/\b(?:akc(?:e|i|ni|nich|nim)|slev\w*|zlevnen\w*)\b/);
    const topOnly = consume(/\b(?:top\s*10\b|nejprodavan\w*|nejobjednav\w*|bestseller\w*)/);
    const outOfStock = consume(/\b(?:nejsou\s+skladem|neni\s+skladem|mimo\s+sklad|nedostupn\w*|vyprodan\w*)\b/);
    const inStock = !outOfStock && consume(/\b(?:skladem|dostupn\w*|skladov\w*)\b/);

    if (categories.length > 1 || consume(/\b(?:bez|krome|mimo|nechci|nikoli|ale)\b/)) {
        return { kind: 'clarify' } as const;
    }
    const name = remaining
        .replace(/\b(?:ukaz|zobraz|najdi|vyhledej|vyfiltruj|doporuc|mi|prosim|chci|hledam|potrebuji|mate|mame|produkty|produkt|jen|pouze|co|je|jsou|v|ve|z|ze|a|nebo)\b/g, ' ')
        .replace(/[?!,]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (!name && !categories.length && !colors.length && !sweetness.length && !newOnly && !featuredOnly && !topOnly && !inStock && !outOfStock) {
        return { kind: 'unknown' } as const;
    }
    return { kind: 'filters', category: categories[0] ?? 'Všechny', name, colors, sweetness, newOnly, featuredOnly, topOnly, inStock, outOfStock } as const;
}
