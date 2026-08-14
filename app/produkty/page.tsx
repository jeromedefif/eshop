import type { Metadata } from 'next';
import { PublicCategoryCard, PublicProductCard } from '@/components/PublicCatalog';
import { CATEGORY_DETAILS, PRODUCT_CATEGORIES, normalizeProductCategory } from '@/lib/product-config';
import { getPublicProducts } from '@/lib/public-products';
import SiteFooter from '@/components/SiteFooter';
import PublicHeader from '@/components/PublicHeader';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Velkoobchodní katalog produktů',
    description: 'Veřejný přehled vín, nápojů, burčáku, plynů a obalového materiálu z B2B katalogu VINARIA s.r.o.',
    alternates: { canonical: '/produkty' },
    openGraph: {
        title: 'Velkoobchodní katalog produktů | Beginy.cz',
        description: 'Prohlédněte si velkoobchodní sortiment společnosti VINARIA s.r.o.',
        url: '/produkty',
        type: 'website',
        locale: 'cs_CZ'
    }
};

export default async function PublicProductsPage() {
    const products = await getPublicProducts();
    const featuredProducts = products
        .filter((product) => product.is_new || product.is_featured)
        .slice(0, 12);

    const categoryCounts = new Map<string, number>();
    for (const product of products) {
        const category = normalizeProductCategory(product.category);
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900">
            <PublicHeader />

            <section className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:pt-16">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">Beginy.cz</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">Velkoobchodní katalog vín a nápojů</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                    Veřejný přehled sortimentu společnosti VINARIA s.r.o. Pro vytvoření objednávky a zobrazení zákaznických funkcí se přihlaste do zabezpečeného B2B katalogu.
                </p>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-8" aria-labelledby="categories-heading">
                <h2 id="categories-heading" className="text-2xl font-bold text-slate-950">Kategorie produktů</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {PRODUCT_CATEGORIES.map((category) => (
                        <PublicCategoryCard
                            key={category}
                            category={category}
                            description={CATEGORY_DETAILS[category].description}
                            productCount={categoryCounts.get(category) || 0}
                        />
                    ))}
                </div>
            </section>

            {featuredProducts.length > 0 && (
                <section className="mx-auto max-w-7xl px-5 py-14" aria-labelledby="featured-heading">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Aktuálně v nabídce</p>
                            <h2 id="featured-heading" className="mt-2 text-2xl font-bold text-slate-950">Novinky a akční produkty</h2>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {featuredProducts.map((product) => <PublicProductCard key={product.id} product={product} />)}
                    </div>
                </section>
            )}

            <SiteFooter />
        </main>
    );
}
