import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicCategoryIcon, PublicProductCard } from '@/components/PublicCatalog';
import { CATEGORY_DETAILS, PRODUCT_CATEGORIES, getCategoryBySlug, normalizeProductCategory } from '@/lib/product-config';
import { getPublicProducts } from '@/lib/public-products';

export const revalidate = 3600;

type CategoryPageProps = { params: { slug: string } };

export function generateStaticParams() {
    return PRODUCT_CATEGORIES.map((category) => ({ slug: CATEGORY_DETAILS[category].slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const category = getCategoryBySlug(params.slug);
    if (!category) return { title: 'Kategorie nebyla nalezena', robots: { index: false, follow: false } };

    const details = CATEGORY_DETAILS[category];
    const canonical = `/produkty/kategorie/${details.slug}`;
    return {
        title: `${category} – velkoobchodní nabídka`,
        description: details.description,
        alternates: { canonical },
        openGraph: {
            title: `${category} – velkoobchodní nabídka | Beginy.cz`,
            description: details.description,
            url: canonical,
            type: 'website',
            locale: 'cs_CZ'
        }
    };
}

export default async function PublicCategoryPage({ params }: CategoryPageProps) {
    const category = getCategoryBySlug(params.slug);
    if (!category) notFound();

    const products = (await getPublicProducts()).filter(
        (product) => normalizeProductCategory(product.category) === category
    );
    const details = CATEGORY_DETAILS[category];
    const pageUrl = `https://www.beginy.cz/produkty/kategorie/${details.slug}`;
    const breadcrumbData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Produkty', item: 'https://www.beginy.cz/produkty' },
            { '@type': 'ListItem', position: 2, name: category, item: pageUrl }
        ]
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData).replace(/</g, '\\u003c') }} />
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
                    <Link href="/produkty" className="text-xl font-bold tracking-tight text-slate-950">VINARIA s.r.o.</Link>
                    <Link href="/login" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Přihlásit do B2B katalogu</Link>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
                <nav aria-label="Drobečková navigace" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                    <Link href="/produkty" className="hover:text-blue-700">Produkty</Link>
                    <span aria-hidden="true">/</span>
                    <span className="text-slate-900">{category}</span>
                </nav>

                <div className="mt-8 flex max-w-4xl items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <PublicCategoryIcon category={category} className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Velkoobchodní kategorie</p>
                        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{category}</h1>
                        <p className="mt-4 text-lg leading-8 text-slate-600">{details.description}</p>
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-between border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-bold text-slate-950">Produkty</h2>
                    <span className="text-sm font-semibold text-slate-500">{products.length} položek</span>
                </div>

                {products.length > 0 ? (
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((product) => <PublicProductCard key={product.id} product={product} />)}
                    </div>
                ) : (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">V této kategorii nyní nejsou zveřejněné žádné produkty.</div>
                )}
            </div>
        </main>
    );
}
