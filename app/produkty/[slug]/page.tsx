import { Suspense } from 'react';
import ProductDetailFavorite from '@/components/ProductDetailFavorite';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { CheckCircle2, Grape, PackageOpen, Sparkles } from 'lucide-react';
import { getCategoryPath, normalizeProductCategory } from '@/lib/product-config';
import { getProductIdFromSlug, getProductPath, getProductSlug } from '@/lib/product-slug';
import { getPublicProductById } from '@/lib/public-products';
import SiteFooter from '@/components/SiteFooter';
import Header from '@/components/Header';
import ProductDetailPurchase from '@/components/ProductDetailPurchase';

export const revalidate = 3600;

// Nezvyšujeme délku buildu o předgenerování celého katalogu. První návštěva
// produktu vytvoří cachovanou stránku, která se poté průběžně obnovuje.
export function generateStaticParams() {
    return [];
}

type ProductPageProps = {
    params: Promise<{ slug: string }>;
};

async function loadProduct(slug: string) {
    const id = getProductIdFromSlug(slug);
    if (!id) return null;
    return getPublicProductById(id);
}

export async function generateMetadata(props: ProductPageProps): Promise<Metadata> {
    const params = await props.params;
    const product = await loadProduct(params.slug);
    if (!product) {
        return {
            title: 'Produkt nebyl nalezen',
            robots: { index: false, follow: false }
        };
    }

    const category = normalizeProductCategory(product.category);
    const description = `${product.name} – ${category}. Produkt z velkoobchodního katalogu VINARIA s.r.o. na Beginy.cz.`;
    const canonical = getProductPath(product);

    return {
        title: product.name,
        description,
        alternates: { canonical },
        openGraph: {
            title: `${product.name} | Beginy.cz`,
            description,
            url: canonical,
            type: 'website',
            locale: 'cs_CZ'
        }
    };
}

export default async function ProductPage(props: ProductPageProps) {
    const params = await props.params;
    const product = await loadProduct(params.slug);
    if (!product) notFound();

    const canonicalSlug = getProductSlug(product);
    if (params.slug !== canonicalSlug) {
        permanentRedirect(getProductPath(product));
    }

    const category = normalizeProductCategory(product.category);
    const productUrl = `https://www.beginy.cz${getProductPath(product)}`;
    const categoryPath = getCategoryPath(category);
    const categoryUrl = `https://www.beginy.cz${categoryPath}`;
    const description = `${product.name} – ${category}. Produkt z velkoobchodního katalogu VINARIA s.r.o. na Beginy.cz.`;
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description,
        category,
        url: productUrl,
        brand: {
            '@type': 'Brand',
            name: 'VINARIA'
        }
    };
    const breadcrumbData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Produkty', item: 'https://www.beginy.cz/produkty' },
            { '@type': 'ListItem', position: 2, name: category, item: categoryUrl },
            { '@type': 'ListItem', position: 3, name: product.name, item: productUrl }
        ]
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData).replace(/</g, '\\u003c') }}
            />

            <Header />

            <div className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
                <nav aria-label="Drobečková navigace" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                    <Link href="/produkty" className="hover:text-blue-700">Produkty</Link>
                    <span aria-hidden="true">/</span>
                    <Link href={categoryPath} className="hover:text-blue-700">{category}</Link>
                    <span aria-hidden="true">/</span>
                    <span className="text-slate-900">{product.name}</span>
                </nav>

                <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)]">
                    <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
                        <div className="flex min-h-32 lg:min-h-64 items-center justify-center bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700 p-5 lg:p-10 text-white">
                            <div className="text-center">
                                <div className="mx-auto flex h-12 w-12 lg:h-24 lg:w-24 items-center justify-center rounded-full border border-white/20 bg-white/10">
                                    {category === 'Perlivé'
                                        ? <Sparkles className="h-7 w-7 lg:h-12 lg:w-12" />
                                        : category === 'PET'
                                            ? <PackageOpen className="h-7 w-7 lg:h-12 lg:w-12" />
                                            : <Grape className="h-7 w-7 lg:h-12 lg:w-12" />}
                                </div>
                                <p className="mt-3 text-xs lg:mt-5 lg:text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">Velkoobchodní katalog</p>
                            </div>
                        </div>

                        <div className="p-5 sm:p-10 lg:p-12">
                            <div className="flex flex-wrap items-center gap-2">
                                <Link href={categoryPath} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-100">{category}</Link>
                                {product.is_new && <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800">Novinka</span>}
                                {product.is_featured && <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-800">Akce</span>}
                            </div>

                            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                                {product.name}
                            </h1>
                            <ProductDetailFavorite id={product.id} />

                            <div className="mt-6 flex items-center gap-2 text-base font-medium">
                                <CheckCircle2 className={`h-5 w-5 ${product.in_stock ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span className={product.in_stock ? 'text-emerald-800' : 'text-slate-600'}>
                                    {product.in_stock ? 'Aktuálně skladem' : 'Momentálně není skladem'}
                                </span>
                            </div>

                            {(product.product_color || product.sweetness) && <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                                {product.product_color && <div><dt className="text-slate-500">Barva</dt><dd className="mt-1 font-semibold">{{ white: 'Bílé', red: 'Červené', rose: 'Růžové' }[product.product_color] || product.product_color}</dd></div>}
                                {product.sweetness && <div><dt className="text-slate-500">Cukernatost</dt><dd className="mt-1 font-semibold">{{ dry: 'Suché', semi_dry: 'Polosuché', semi_sweet: 'Polosladké', sweet: 'Sladké' }[product.sweetness] || product.sweetness}</dd></div>}
                            </dl>}
                            <Suspense fallback={<p className="mt-6 text-slate-600">Načítáme možnosti objednání…</p>}>
                                <ProductDetailPurchase key={product.id} id={product.id} path={getProductPath(product)} />
                            </Suspense>
                            {['Víno', 'Perlivé', 'Ovocné víno', 'Burčák', 'Nápoje'].includes(category) && (
                                <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">
                                    Víno a nápoje plníme až podle vaší objednávky do nabízených balení — objednejte proto začátkem týdne pro pravidelný rozvoz.
                                </p>
                            )}
                        </div>
                    </div>
                </article>
            </div>
            <SiteFooter />
        </main>
    );
}
