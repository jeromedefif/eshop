'use client';

import React, { useMemo, useState } from 'react';
import { Archive, Edit2, PackageCheck, PlusCircle, RotateCcw, Search, Trash2, X } from 'lucide-react';
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
        : normalizeProductCategory(formData.category) === 'PET' || normalizeProductCategory(formData.category) === 'Lahve'
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

const AdminProducts = ({ products, onProductsChange, onAddProduct, onUpdateProduct, onDeleteProduct, onArchiveProduct, onRestoreProduct }: AdminProductsProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const filteredProducts = useMemo(() => products.filter((product) => {
        if (!showArchived && product.is_archived) return false;
        const query = searchQuery.toLowerCase();
        return product.name.toLowerCase().includes(query) || normalizeProductCategory(product.category).toLowerCase().includes(query);
    }), [products, searchQuery, showArchived]);

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

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex flex-wrap justify-between gap-3 items-center mb-6">
                <div><h2 className="text-2xl font-bold text-gray-900">Správa produktů</h2><p className="text-sm text-gray-600 mt-1">Archivované produkty zákazníci nevidí; vyprodané zůstávají v katalogu označené jako nedostupné.</p></div>
                {!isAddingNew && <button onClick={() => setIsAddingNew(true)} disabled={isLoading} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"><PlusCircle className="w-5 h-5 mr-2" />Přidat produkt</button>}
            </div>

            {isAddingNew && <div className="mb-6"><ProductForm initialData={emptyForm()} idPrefix="new-product" title="Nový produkt" onSave={(data) => handleSave(null, data)} onCancel={() => setIsAddingNew(false)} isLoading={isLoading} /></div>}

            <div className="mb-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative flex-1"><Search className="absolute h-5 w-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" /><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Vyhledat produkt..." className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" />{searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"><X className="w-5 h-5" /></button>}</div>
                <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-700"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="h-4 w-4 text-blue-600 rounded" />Zobrazit archivované</label>
            </div>

            <div className="md:hidden space-y-3">
                {filteredProducts.map((product) => <div key={product.id} className={`bg-white p-4 rounded-lg border shadow-sm ${product.is_archived ? 'opacity-70 border-amber-300' : 'border-gray-200'}`}>
                    <div className="flex justify-between gap-3"><div><h3 className="font-medium text-gray-900">{product.name}</h3><p className="text-sm text-gray-600">{normalizeProductCategory(product.category)}</p></div><ProductBadges product={product} /></div>
                    <ProductActions product={product} onEdit={() => setEditingId(product.id)} onDelete={() => handleDelete(product)} onArchive={() => handleArchive(product)} onRestore={() => handleRestore(product)} disabled={isLoading} />
                    {editingId === product.id && <div className="mt-4"><ProductForm initialData={formFromProduct(product)} idPrefix={`edit-${product.id}`} title="Upravit produkt" onSave={(data) => handleSave(product.id, data)} onCancel={() => setEditingId(null)} isLoading={isLoading} /></div>}
                </div>)}
            </div>

            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Název</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stav</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akce</th></tr></thead><tbody className="divide-y divide-gray-200">{filteredProducts.map((product) => <React.Fragment key={product.id}><tr className={product.is_archived ? 'bg-amber-50' : 'hover:bg-gray-50'}><td className="px-4 py-4 text-sm font-medium text-gray-900">{product.name}</td><td className="px-4 py-4 text-sm text-gray-700">{normalizeProductCategory(product.category)}</td><td className="px-4 py-4"><ProductBadges product={product} onToggleStock={() => toggleStock(product)} disabled={isLoading} /></td><td className="px-4 py-4"><ProductActions product={product} onEdit={() => setEditingId(product.id)} onDelete={() => handleDelete(product)} onArchive={() => handleArchive(product)} onRestore={() => handleRestore(product)} disabled={isLoading} /></td></tr>{editingId === product.id && <tr><td colSpan={4} className="p-4 bg-blue-50"><ProductForm initialData={formFromProduct(product)} idPrefix={`edit-${product.id}`} title="Upravit produkt" onSave={(data) => handleSave(product.id, data)} onCancel={() => setEditingId(null)} isLoading={isLoading} /></td></tr>}</React.Fragment>)}</tbody></table></div>
            {!filteredProducts.length && <div className="text-center py-10 text-gray-600">Nenalezeny žádné produkty.</div>}
        </div>
    );
};

function ProductBadges({ product, onToggleStock, disabled }: { product: Product; onToggleStock?: () => void; disabled?: boolean }) {
    return <div className="flex flex-wrap gap-1.5 items-center"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.is_archived ? 'bg-amber-100 text-amber-900' : product.in_stock ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{product.is_archived ? 'Archivováno' : product.in_stock ? 'Skladem' : 'Není skladem'}</span>{product.is_new && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-800">Novinka</span>}{product.is_featured && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Akce</span>}{onToggleStock && !product.is_archived && <button onClick={onToggleStock} disabled={disabled} className="text-xs text-blue-700 hover:underline disabled:opacity-50">Změnit sklad</button>}</div>;
}

function ProductActions({ product, onEdit, onDelete, onArchive, onRestore, disabled }: { product: Product; onEdit: () => void; onDelete: () => void; onArchive: () => void; onRestore: () => void; disabled: boolean }) {
    if (product.is_archived) return <div className="mt-3 flex justify-end"><button onClick={onRestore} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 disabled:opacity-50"><RotateCcw className="w-4 h-4" />Obnovit</button></div>;
    return <div className="mt-3 flex justify-end gap-3"><button onClick={onEdit} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 disabled:opacity-50"><Edit2 className="w-4 h-4" />Upravit</button><button onClick={onArchive} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 disabled:opacity-50"><Archive className="w-4 h-4" />Archivovat</button><button onClick={onDelete} disabled={disabled} className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 disabled:opacity-50"><Trash2 className="w-4 h-4" />Odstranit</button></div>;
}

export default AdminProducts;
