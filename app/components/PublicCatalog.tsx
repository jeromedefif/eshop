import Link from 'next/link';
import { Amphora, Box, Grape, Martini, Package, Sparkles, TestTube, Wine } from 'lucide-react';
import type { PublicProduct } from '@/lib/public-products';
import { getAllowedVolumes, getCategoryPath, normalizeProductCategory } from '@/lib/product-config';
import { getProductPath } from '@/lib/product-slug';

const CATEGORY_THEME: Record<string, { icon: typeof Grape; iconClass: string; panelClass: string; chipClass: string }> = {
    'Víno': { icon: Grape, iconClass: 'text-purple-700', panelClass: 'from-purple-50 to-white', chipClass: 'bg-purple-50 text-purple-800' },
    'Perlivé': { icon: Sparkles, iconClass: 'text-teal-700', panelClass: 'from-teal-50 to-white', chipClass: 'bg-teal-50 text-teal-800' },
    'Nápoje': { icon: Martini, iconClass: 'text-blue-700', panelClass: 'from-blue-50 to-white', chipClass: 'bg-blue-50 text-blue-800' },
    'Ovocné víno': { icon: Wine, iconClass: 'text-rose-700', panelClass: 'from-rose-50 to-white', chipClass: 'bg-rose-50 text-rose-800' },
    'Burčák': { icon: Amphora, iconClass: 'text-orange-700', panelClass: 'from-orange-50 to-white', chipClass: 'bg-orange-50 text-orange-800' },
    'Plyny': { icon: TestTube, iconClass: 'text-cyan-700', panelClass: 'from-cyan-50 to-white', chipClass: 'bg-cyan-50 text-cyan-800' },
    'PET': { icon: Box, iconClass: 'text-amber-700', panelClass: 'from-amber-50 to-white', chipClass: 'bg-amber-50 text-amber-800' }
};

const DEFAULT_THEME = { icon: Package, iconClass: 'text-slate-700', panelClass: 'from-slate-50 to-white', chipClass: 'bg-slate-100 text-slate-800' };

function formatProductCount(count: number) {
    if (count === 1) return '1 produkt';
    if (count >= 2 && count <= 4) return `${count} produkty`;
    return `${count} produktů`;
}

export function formatPublicVolume(volume: string) {
    if (volume === 'maly') return 'malá láhev';
    if (volume === 'velky') return 'velká láhev';
    if (volume === 'baleni') return 'balení';
    return `${volume} L`;
}

export function PublicCategoryIcon({ category, className = 'h-6 w-6' }: { category: string; className?: string }) {
    const normalized = normalizeProductCategory(category);
    const theme = CATEGORY_THEME[normalized] || DEFAULT_THEME;
    const Icon = theme.icon;
    return <Icon className={`${className} ${theme.iconClass}`} aria-hidden="true" />;
}

export function PublicProductCard({ product }: { product: PublicProduct }) {
    const category = normalizeProductCategory(product.category);
    const theme = CATEGORY_THEME[category] || DEFAULT_THEME;
    const volumes = getAllowedVolumes(product);

    return (
        <Link
            href={getProductPath(product)}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
        >
            <div className={`flex items-center justify-between bg-gradient-to-br ${theme.panelClass} px-5 py-4`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white bg-white/80 shadow-sm">
                    <PublicCategoryIcon category={category} />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {product.is_new && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">Novinka</span>}
                    {product.is_featured && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">Akce</span>}
                </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${theme.chipClass}`}>{category}</span>
                <h2 className="mt-3 text-lg font-bold leading-snug text-slate-950 transition group-hover:text-blue-700">{product.name}</h2>

                {volumes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {volumes.map((volume) => (
                            <span key={volume} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                {formatPublicVolume(volume)}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
                    <span className={product.in_stock ? 'font-semibold text-emerald-700' : 'font-medium text-slate-500'}>
                        {product.in_stock ? 'Skladem' : 'Momentálně není skladem'}
                    </span>
                    <span className="font-bold text-blue-700">Detail →</span>
                </div>
            </div>
        </Link>
    );
}

export function PublicCategoryCard({ category, description, productCount }: { category: string; description: string; productCount: number }) {
    const normalized = normalizeProductCategory(category);
    const theme = CATEGORY_THEME[normalized] || DEFAULT_THEME;

    return (
        <Link
            href={getCategoryPath(normalized)}
            className={`group rounded-2xl border border-slate-200 bg-gradient-to-br ${theme.panelClass} p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white bg-white/80 shadow-sm">
                    <PublicCategoryIcon category={normalized} className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">{formatProductCount(productCount)}</span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-950 group-hover:text-blue-700">{normalized}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            <span className="mt-5 inline-flex text-sm font-bold text-blue-700">Zobrazit kategorii →</span>
        </Link>
    );
}
