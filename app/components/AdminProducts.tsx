'use client';

import React, { useMemo, useState } from 'react';
import { Amphora, Archive, Box, Edit2, Grape, ListFilter, Martini, Package, PlusCircle, RotateCcw, Search, Sparkles, Star, Tag, TestTube, Trash2, Wine, X } from 'lucide-react';
import type { Product, CreateProductInput } from '@/types/database';
import type { DeleteProductResult } from '@/lib/products';
import { PRODUCT_CATEGORIES, getAllowedVolumes, getDefaultAllowedVolumes, normalizeProductCategory } from '@/lib/product-config';

type ProductFormData = Omit<CreateProductInput, 'is_archived' | 'archived_at'>;

interface AdminProductsProps {
    products: Product[];
    onProductsChange: () => Promise<void>;
    onAddProduct: (product: CreateProductInput) => Promise<Product>;
    onUpdateProduct: (product: Product) => Promise<Product>;
    onDeleteProduct: (id: string) => Promise<DeleteProductResult>;
    onArchiveProduct: (id: string) => Promise<Product>;
    onRestoreProduct: (id: string) => Promise<Product>;
}

const formFromProduct = (product: Product): ProductFormData => ({
    name: product.name,
    category: normalizeProductCategory(product.category),
    in_stock: product.in_stock,
    is_new: product.is_new,
    is_featured: product.is_featured,
    sort_priority: product.sort_priority,
    min_order_qty: product.min_order_qty,
    allowed_volumes: getAllowedVolumes(product)
});

const emptyForm = (): ProductFormData => ({
    name: '',
    category: 'Nápoje',
    in_stock: true,
    is_new: false,
    is_featured: false,
    sort_priority: 0,
    min_order_qty: 1,
    allowed_volumes: getDefaultAllowedVolumes('Nápoje')
});

function VolumeSelector({ formData, setFormData, idPrefix, disabled }: {
    formData: ProductFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
    idPrefix: string;
    disabled: boolean;
}) {
    const options = getDefaultAllowedVolumes(formData.category);
    if (options.length === 0) return null;

    const label = normalizeProductCategory(formData.category) === 'Plyny'
        ? 'Povolené velikosti lahve'
        : normalizeProductCategory(formData.category) === 'PET'
            ? 'Dostupné balení'
            : 'Povolené objemy';

    return (
        <fieldset>
            <legend className="block text-sm font-medium text-gray-900 mb-2">{label}</legend>
            <div className="flex flex-wrap gap-2">
                {options.map((volume) => {
                    const checked = formData.allowed_volumes.includes(volume);
                    const readable = volume === 'maly' ? 'malý' : volume === 'velky' ? 'velký' : volume === 'baleni' ? 'balení' : `${volume}L`;
                    return (
                        <button
                            key={volume}
                            id={`${idPrefix}-${volume}`}
                            type="button"
                            aria-pressed={checked}
                            disabled={disabled}
                            onClick={() => setFormData((previous) => ({
                                ...previous,
                                allowed_volumes: previous.allowed_volumes.includes(volume)
                                    ? previous.allowed_volumes.filter((item) => item !== volume)
                                    : [...previous.allowed_volumes, volume]
                            }))}
                            className={`rounded-md border px-3 py-1.5 text-sm ${checked ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-300 bg-white text-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
                        >
                            {readable}
                        </button>
                    );
                })}
            </div>
            <p className="mt-1 text-xs text-gray-500">Prázdná volba znamená, že produkt nepůjde objednat; uložení proto vyžaduje alespoň jednu hodnotu.</p>
        </fieldset>
    );
}

function ProductFields({ formData, setFormData, idPrefix, disabled }: {
    formData: ProductFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
    idPrefix: string;
    disabled: boolean;
}) {
    return (
        <div className="space-y-4">
            <div>
                <label htmlFor={`${idPrefix}-name`} className="block text-sm font-medium text-gray-900 mb-1">Název produktu</label>
                <input id={`${idPrefix}-name`} type="text" value={formData.name} required disabled={disabled} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${idPrefix}-category`} className="block text-sm font-medium text-gray-900 mb-1">Kategorie</label>
                    <select id={`${idPrefix}-category`} value={formData.category} disabled={disabled} onChange={(event) => {
                        const category = event.target.value;
                        setFormData({ ...formData, category, allowed_volumes: getDefaultAllowedVolumes(category) });
                    }} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900">
                        {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-minimum`} className="block text-sm font-medium text-gray-900 mb-1">Minimální odběr (ks)</label>
                    <input id={`${idPrefix}-minimum`} type="number" min="1" step="1" value={formData.min_order_qty} disabled={disabled} onChange={(event) => setFormData({ ...formData, min_order_qty: Math.max(1, Number(event.target.value) || 1) })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900" />
                </div>
            </div>
            <VolumeSelector formData={formData} setFormData={setFormData} idPrefix={idPrefix} disabled={disabled} />
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-900"><input type="checkbox" checked={formData.in_stock} disabled={disabled} onChange={(event) => setFormData({ ...formData, in_stock: event.target.checked })} className="h-4 w-4 text-blue-600 rounded" />Skladem</label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-900"><input type="checkbox" checked={formData.is_new} disabled={disabled} onChange={(event) => setFormData({ ...formData, is_new: event.target.checked })} className="h-4 w-4 text-blue-600 rounded" />Novinka</label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-900"><input type="checkbox" checked={formData.is_featured} disabled={disabled} onChange={(event) => setFormData({ ...formData, is_featured: event.target.checked })} className="h-4 w-4 text-blue-600 rounded" />Akce</label>
                <div>
                    <label htmlFor={`${idPrefix}-priority`} className="block text-sm font-medium text-gray-900 mb-1">Priorita řazení</label>
                    <input id={`${idPrefix}-priority`} type="number" value={formData.sort_priority} disabled={disabled} onChange={(event) => setFormData({ ...formData, sort_priority: Number(event.target.value) || 0 })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900" />
                </div>
            </div>
        </div>
    );
}

function ProductForm({ initialData, idPrefix, onSave, onCancel, isLoading, title }: {
    initialData: ProductFormData;
    idPrefix: string;
    onSave: (data: ProductFormData) => void;
    onCancel: () => void;
    isLoading: boolean;
    title: string;
}) {
    const [formData, setFormData] = useState(initialData);
    return (
        <form onSubmit={(event) => { event.preventDefault(); if (formData.name.trim() && formData.allowed_volumes.length) onSave(formData); }} className="bg-white p-5 rounded-lg shadow-inner border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <ProductFields formData={formData} setFormData={setFormData} idPrefix={idPrefix} disabled={isLoading} />
            <div className="flex justify-end gap-3 pt-5">
                <button type="button" onClick={onCancel} disabled={isLoading} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">Zrušit</button>
                <button type="submit" disabled={isLoading || !formData.name.trim() || !formData.allowed_volumes.length} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300">{isLoading ? 'Ukládám...' : 'Uložit'}</button>
            </div>
        </form>
    );
}

type AvailabilityFilter = 'all' | 'in-stock' | 'out-of-stock';
type SortOption = 'catalog' | 'name' | 'priority' | 'newest' | 'archived-last';

const CATEGORY_FILTERS = [
    { id: 'Všechny', label: 'Vše', icon: ListFilter, color: 'text-gray-700' },
    { id: 'Víno', label: 'Víno', icon: Grape, color: 'text-purple-700' },
    { id: 'Perlivé', label: 'Perlivé', icon: Sparkles, color: 'text-teal-700' },
    { id: 'Nápoje', label: 'Nápoje', icon: Martini, color: 'text-blue-700' },
    { id: 'Ovocné víno', label: 'Ovocné', icon: Wine, color: 'text-rose-700' },
    { id: 'Burčák', label: 'Burčák', icon: Amphora, color: 'text-orange-700' },
    { id: 'Plyny', label: 'Plyny', icon: TestTube, color: 'text-cyan-700' },
    { id: 'PET', label: 'PET', icon: Box, color: 'text-amber-700' }
] as const;

const getCategoryIcon = (category: string) => {
    const normalized = normalizeProductCategory(category);
    const item = CATEGORY_FILTERS.find((filter) => filter.id === normalized);
    const Icon = item?.icon || Package;
    return <Icon className={`h-5 w-5 ${item?.color || 'text-gray-600'}`} />;
};

const formatAllowedVolumes = (product: Product) => getAllowedVolumes(product).map((volume) => {
    if (volume === 'maly') return 'malý';
    if (volume === 'velky') return 'velký';
    if (volume === 'baleni') return 'balení';
    return `${volume}L`;
});

const AdminProducts = ({ products, onProductsChange, onAddProduct, onUpdateProduct, onDeleteProduct, onArchiveProduct, onRestoreProduct }: AdminProductsProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Všechny');
    const [availability, setAvailability] = useState<AvailabilityFilter>('all');
    const [onlyNew, setOnlyNew] = useState(false);
    const [onlyFeatured, setOnlyFeatured] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('catalog');

    const visibleProducts = useMemo(() => products.filter((product) => showArchived ? product.is_archived : !product.is_archived), [products, showArchived]);

    const categoryCounts = useMemo(() => Object.fromEntries(CATEGORY_FILTERS.map((filter) => [
        filter.id,
        filter.id === 'Všechny'
            ? visibleProducts.length
            : visibleProducts.filter((product) => normalizeProductCategory(product.category) === filter.id).length
    ])), [visibleProducts]);

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase('cs-CZ');
        const categoryIndex = (category: string) => {
            const index = PRODUCT_CATEGORIES.indexOf(normalizeProductCategory(category) as typeof PRODUCT_CATEGORIES[number]);
            return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };

        return products
            .filter((product) => {
                if (showArchived ? !product.is_archived : product.is_archived) return false;
                if (selectedCategory !== 'Všechny' && normalizeProductCategory(product.category) !== selectedCategory) return false;
                if (availability === 'in-stock' && (!product.in_stock || product.is_archived)) return false;
                if (availability === 'out-of-stock' && (product.in_stock || product.is_archived)) return false;
                if (onlyNew && !product.is_new) return false;
                if (onlyFeatured && !product.is_featured) return false;
                if (!query) return true;
                return product.name.toLocaleLowerCase('cs-CZ').includes(query)
                    || normalizeProductCategory(product.category).toLocaleLowerCase('cs-CZ').includes(query);
            })
            .sort((a, b) => {
                if (sortOption === 'name') return a.name.localeCompare(b.name, 'cs');
                if (sortOption === 'priority') return b.sort_priority - a.sort_priority || a.name.localeCompare(b.name, 'cs');
                if (sortOption === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                if (sortOption === 'archived-last') return Number(a.is_archived) - Number(b.is_archived) || a.name.localeCompare(b.name, 'cs');

                return categoryIndex(a.category) - categoryIndex(b.category)
                    || Number(b.is_new) - Number(a.is_new)
                    || Number(b.is_featured) - Number(a.is_featured)
                    || b.sort_priority - a.sort_priority
                    || a.name.localeCompare(b.name, 'cs');
            });
    }, [availability, onlyFeatured, onlyNew, products, searchQuery, selectedCategory, showArchived, sortOption]);

    const refresh = async () => { await onProductsChange(); };

    const handleSave = async (id: string | null, data: ProductFormData) => {
        setIsLoading(true);
        try {
            if (id) {
                const existing = products.find((product) => product.id === id);
                if (!existing) return;
                await onUpdateProduct({ ...existing, ...data, category: normalizeProductCategory(data.category) });
                setEditingId(null);
            } else {
                await onAddProduct({ ...data, category: normalizeProductCategory(data.category), is_archived: false, archived_at: null });
                setIsAddingNew(false);
            }
            await refresh();
        } catch (error) {
            console.error('Product save error:', error);
            alert('Produkt se nepodařilo uložit.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (product: Product) => {
        if (!window.confirm(`Opravdu chcete odstranit produkt „${product.name}“?\n\nPokud už je v historii objednávek, bude bezpečně archivován.`)) return;
        setIsLoading(true);
        try {
            const result = await onDeleteProduct(product.id);
            await refresh();
            if (result.mode === 'archived') alert(result.message);
        } catch (error) {
            console.error('Product delete error:', error);
            alert('Produkt se nepodařilo odstranit.');
        } finally { setIsLoading(false); }
    };

    const handleArchive = async (product: Product) => {
        if (!window.confirm(`Archivovat produkt „${product.name}“? Zákazníkům se přestane zobrazovat, historie objednávek zůstane zachována.`)) return;
        setIsLoading(true);
        try { await onArchiveProduct(product.id); await refresh(); } catch (error) { console.error(error); alert('Produkt se nepodařilo archivovat.'); } finally { setIsLoading(false); }
    };

    const handleRestore = async (product: Product) => {
        setIsLoading(true);
        try { await onRestoreProduct(product.id); await refresh(); } catch (error) { console.error(error); alert('Produkt se nepodařilo obnovit.'); } finally { setIsLoading(false); }
    };

    const toggleStock = async (product: Product) => {
        setIsLoading(true);
        try { await onUpdateProduct({ ...product, in_stock: !product.in_stock }); await refresh(); } catch (error) { console.error(error); alert('Stav skladu se nepodařilo změnit.'); } finally { setIsLoading(false); }
    };

    const updateQuickSetting = async (product: Product, updates: Partial<Product>) => {
        setIsLoading(true);
        try {
            await onUpdateProduct({ ...product, ...updates });
            await refresh();
        } catch (error) {
            console.error('Product quick update error:', error);
            alert('Nastavení produktu se nepodařilo změnit.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex flex-wrap justify-between gap-3 items-center mb-6">
                <div><h2 className="text-2xl font-bold text-gray-900">Správa produktů</h2><p className="text-sm text-gray-600 mt-1">Archivované produkty zákazníci nevidí; vyprodané zůstávají v katalogu označené jako nedostupné.</p></div>
                {!isAddingNew && <button onClick={() => setIsAddingNew(true)} disabled={isLoading} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"><PlusCircle className="w-5 h-5 mr-2" />Přidat produkt</button>}
            </div>

            {isAddingNew && <div className="mb-6"><ProductForm initialData={emptyForm()} idPrefix="new-product" title="Nový produkt" onSave={(data) => handleSave(null, data)} onCancel={() => setIsAddingNew(false)} isLoading={isLoading} /></div>}

            <section className="mb-5 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {CATEGORY_FILTERS.map((filter) => {
                        const Icon = filter.icon;
                        const active = selectedCategory === filter.id;
                        return <button key={filter.id} type="button" onClick={() => setSelectedCategory(filter.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}><Icon className={`h-5 w-5 ${active ? 'text-blue-700' : filter.color}`} />{filter.label}<span className="text-xs opacity-75">{categoryCounts[filter.id]}</span></button>;
                    })}
                </div>
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1"><Search className="absolute h-5 w-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" /><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Vyhledat podle názvu nebo kategorie..." className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"><X className="w-5 h-5" /></button>}</div>
                    <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"><option value="catalog">Kategorie a doporučené</option><option value="name">Název A–Z</option><option value="priority">Priorita</option><option value="newest">Nejnovější</option><option value="archived-last">Archivované naposled</option></select>
                </div>
                <div className="flex flex-wrap gap-2">
                    <FilterButton active={availability === 'all'} onClick={() => setAvailability('all')}>Všechny stavy</FilterButton>
                    <FilterButton active={availability === 'in-stock'} onClick={() => setAvailability('in-stock')}>Skladem</FilterButton>
                    <FilterButton active={availability === 'out-of-stock'} onClick={() => setAvailability('out-of-stock')}>Není skladem</FilterButton>
                    <FilterButton active={onlyNew} onClick={() => setOnlyNew((value) => !value)} icon={<Star className="h-4 w-4" />}>Novinka</FilterButton>
                    <FilterButton active={onlyFeatured} onClick={() => setOnlyFeatured((value) => !value)} icon={<Tag className="h-4 w-4" />}>Akce</FilterButton>
                    <FilterButton active={showArchived} onClick={() => setShowArchived((value) => !value)} icon={<Archive className="h-4 w-4" />}>Archivované</FilterButton>
                </div>
            </section>

            <div className="space-y-3">
                {filteredProducts.map((product) => <article key={product.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${product.is_archived ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                    <div className="p-4 sm:p-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                            <div className="min-w-0">
                                <button type="button" onClick={() => setEditingId(editingId === product.id ? null : product.id)} className="flex items-center gap-2 text-left text-lg font-semibold text-gray-900 hover:text-blue-700"><span>{getCategoryIcon(product.category)}</span><span>{product.name}</span></button>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600"><span>{normalizeProductCategory(product.category)}</span><ProductBadges product={product} /></div>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:justify-end"><QuickToggle active={product.in_stock} disabled={isLoading || product.is_archived} onClick={() => toggleStock(product)}>Skladem</QuickToggle><QuickToggle active={product.is_new} disabled={isLoading || product.is_archived} onClick={() => updateQuickSetting(product, { is_new: !product.is_new })}>Novinka</QuickToggle><QuickToggle active={product.is_featured} disabled={isLoading || product.is_archived} onClick={() => updateQuickSetting(product, { is_featured: !product.is_featured })}>Akce</QuickToggle></div>
                        </div>
                        <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                            <ProductInfo label="Povolené objemy"><div className="flex flex-wrap gap-1.5">{formatAllowedVolumes(product).map((volume) => <span key={volume} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800">{volume}</span>)}</div></ProductInfo>
                            <ProductInfo label="Minimální odběr"><span className="font-medium text-gray-900">{product.min_order_qty} ks</span></ProductInfo>
                            <ProductInfo label="Priorita řazení"><span className="font-medium text-gray-900">{product.sort_priority}</span></ProductInfo>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-gray-100 pt-3"><ProductActions product={product} onEdit={() => setEditingId(editingId === product.id ? null : product.id)} onDelete={() => handleDelete(product)} onArchive={() => handleArchive(product)} onRestore={() => handleRestore(product)} disabled={isLoading} /></div>
                    </div>
                    {editingId === product.id && <div className="border-t border-blue-100 bg-blue-50 p-4 sm:p-5"><ProductForm initialData={formFromProduct(product)} idPrefix={`edit-${product.id}`} title={`Upravit: ${product.name}`} onSave={(data) => handleSave(product.id, data)} onCancel={() => setEditingId(null)} isLoading={isLoading} /></div>}
                </article>)}
            </div>
            {!filteredProducts.length && <div className="text-center py-10 text-gray-600">Nenalezeny žádné produkty.</div>}
        </div>
    );
};

function FilterButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
    return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${active ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>{icon}{children}</button>;
}

function QuickToggle({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
    return <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'}`}>{children}</button>;
}

function ProductInfo({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>{children}</div>;
}

function ProductBadges({ product }: { product: Product }) {
    return <div className="flex flex-wrap gap-1.5 items-center"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.is_archived ? 'bg-amber-100 text-amber-900' : product.in_stock ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{product.is_archived ? 'Archivováno' : product.in_stock ? 'Skladem' : 'Není skladem'}</span>{product.is_new && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-800">Novinka</span>}{product.is_featured && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Akce</span>}</div>;
}

function ProductActions({ product, onEdit, onDelete, onArchive, onRestore, disabled }: { product: Product; onEdit: () => void; onDelete: () => void; onArchive: () => void; onRestore: () => void; disabled: boolean }) {
    if (product.is_archived) return <button type="button" onClick={onRestore} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 disabled:opacity-50"><RotateCcw className="w-4 h-4" />Obnovit</button>;
    return <><button type="button" onClick={onEdit} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 disabled:opacity-50"><Edit2 className="w-4 h-4" />Upravit</button><button type="button" onClick={onArchive} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 disabled:opacity-50"><Archive className="w-4 h-4" />Archivovat</button><button type="button" onClick={onDelete} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 disabled:opacity-50"><Trash2 className="w-4 h-4" />Odstranit</button></>;
}

export default AdminProducts;
