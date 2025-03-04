// app/components/AdminProducts.tsx
'use client';

import React, { useState } from 'react';
import { PlusCircle, Edit2, Trash2, X, Search, MoreHorizontal, ChevronDown } from 'lucide-react';
import type { Product, CreateProductInput } from '@/types/database';

interface AdminProductsProps {
    products: Product[];
    onProductsChange: () => Promise<void>;
    onAddProduct: (product: CreateProductInput) => Promise<void>;
    onUpdateProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (id: string) => Promise<void>;
}

interface ProductFormData {
    name: string;
    category: string;
    in_stock: boolean;
}

interface EditFormProps {
    product: Product;
    onSave: (formData: ProductFormData) => void;
    onCancel: () => void;
    isLoading: boolean;
}

interface AddProductFormProps {
    onSave: (formData: ProductFormData) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const CATEGORIES = ["Víno", "Nápoje", "Ovocné víno", "Dusík", "PET"] as const;
type Category = typeof CATEGORIES[number];

const EditForm = ({
    product,
    onSave,
    onCancel,
    isLoading
}: EditFormProps) => {
    const [formData, setFormData] = useState<ProductFormData>({
        name: product.name,
        category: product.category,
        in_stock: product.in_stock
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-inner border border-blue-100">
            <div className="space-y-4">
                <div>
                    <label htmlFor={`name-${product.id}`} className="block text-sm font-medium text-gray-900 mb-1">
                        Název produktu
                    </label>
                    <input
                        id={`name-${product.id}`}
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                        required
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor={`category-${product.id}`} className="block text-sm font-medium text-gray-900 mb-1">
                        Kategorie
                    </label>
                    <select
                        id={`category-${product.id}`}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                        disabled={isLoading}
                    >
                        {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id={`in_stock-${product.id}`}
                        checked={formData.in_stock}
                        onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={isLoading}
                    />
                    <label htmlFor={`in_stock-${product.id}`} className="ml-2 block text-sm font-medium text-gray-900">
                        Skladem
                    </label>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                        disabled={isLoading}
                    >
                        <X className="w-4 h-4 mr-1" />
                        Zrušit
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center"
                        disabled={isLoading || !formData.name.trim()}
                    >
                        {isLoading ? 'Ukládám...' : 'Uložit změny'}
                    </button>
                </div>
            </div>
        </form>
    );
};

const AddProductForm = ({
    onSave,
    onCancel,
    isLoading
}: AddProductFormProps) => {
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        category: CATEGORIES[0],
        in_stock: true
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Nový produkt</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="newProductName" className="block text-sm font-medium text-gray-900 mb-1">
                        Název produktu
                    </label>
                    <input
                        id="newProductName"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                        required
                        disabled={isLoading}
                        placeholder="Zadejte název produktu"
                    />
                </div>
                <div>
                    <label htmlFor="newProductCategory" className="block text-sm font-medium text-gray-900 mb-1">
                        Kategorie
                    </label>
                    <select
                        id="newProductCategory"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                        disabled={isLoading}
                    >
                        {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="newProductInStock"
                        checked={formData.in_stock}
                        onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={isLoading}
                    />
                    <label htmlFor="newProductInStock" className="ml-2 block text-sm font-medium text-gray-900">
                        Skladem
                    </label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isLoading}
                    >
                        Zrušit
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                        disabled={isLoading || !formData.name.trim()}
                    >
                        {isLoading ? 'Ukládám...' : 'Přidat produkt'}
                    </button>
                </div>
            </div>
        </form>
    );
};

// Komponenta pro dropdown menu akcí (pro tablety)
const ActionsDropdown = ({
    onEdit,
    onDelete
}: {
    onEdit: () => void;
    onDelete: () => void
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                title="Akce"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>

            {isOpen && (
                <>
                    {/* Overlay pro zavření menu při kliknutí mimo */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg overflow-hidden z-20 border border-gray-200">
                        <div className="py-1">
                            <button
                                onClick={() => {
                                    onEdit();
                                    setIsOpen(false);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                            >
                                <Edit2 className="w-4 h-4 mr-2 text-blue-600" />
                                Upravit
                            </button>
                            <button
                                onClick={() => {
                                    onDelete();
                                    setIsOpen(false);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                            >
                                <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                                Smazat
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Komponenta karty produktu pro mobilní zobrazení
const ProductCard = ({
    product,
    onEdit,
    onDelete,
    onToggleStock
}: {
    product: Product;
    onEdit: () => void;
    onDelete: () => void;
    onToggleStock: () => void;
}) => {
    return (
        <div className="bg-white p-4 rounded-lg mb-3 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
                <h3 className="font-medium text-gray-900 pr-2">{product.name}</h3>
                <div className="flex space-x-1 shrink-0">
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600"
                        title="Upravit"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-full hover:bg-red-50 text-red-600"
                        title="Smazat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="mt-2 flex justify-between text-sm items-center">
                <span className="text-gray-600">{product.category}</span>
                <button
                    onClick={onToggleStock}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        product.in_stock
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                    title={product.in_stock ? "Kliknutím označíte jako 'Není skladem'" : "Kliknutím označíte jako 'Skladem'"}
                >
                    {product.in_stock ? 'Skladem' : 'Není skladem'}
                </button>
            </div>
        </div>
    );
};

const AdminProducts = ({
    products,
    onProductsChange,
    onAddProduct,
    onUpdateProduct,
    onDeleteProduct
}: AdminProductsProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!window.confirm('Opravdu chcete smazat tento produkt?')) return;

        setIsLoading(true);
        try {
            await onDeleteProduct(id);
            await onProductsChange();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Nepodařilo se smazat produkt');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStock = async (product: Product) => {
        setIsLoading(true);
        try {
            // Obrátit aktuální hodnotu in_stock
            const updatedProduct = {...product, in_stock: !product.in_stock};
            await onUpdateProduct(updatedProduct);
            await onProductsChange();
        } catch (error) {
            console.error('Error toggling product stock status:', error);
            alert('Nepodařilo se změnit stav skladu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInlineUpdate = async (productId: string, formData: ProductFormData) => {
        setIsLoading(true);
        try {
            await onUpdateProduct({
                ...formData,
                id: productId
            });
            await onProductsChange();
            setEditingId(null);
        } catch (error) {
            console.error('Error updating product:', error);
            alert('Nepodařilo se aktualizovat produkt');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddProduct = async (formData: ProductFormData) => {
        setIsLoading(true);
        try {
            await onAddProduct(formData);
            await onProductsChange();
            setIsAddingNew(false);
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Nepodařilo se přidat produkt');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Správa produktů</h2>
                {!isAddingNew && (
                    <button
                        onClick={() => setIsAddingNew(true)}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Přidat produkt
                    </button>
                )}
            </div>

            {isAddingNew && (
                <AddProductForm
                    onSave={handleAddProduct}
                    onCancel={() => setIsAddingNew(false)}
                    isLoading={isLoading}
                />
            )}

            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Vyhledat produkt..."
                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="mt-2 text-sm text-gray-600">
                        Nalezeno {filteredProducts.length} produktů
                    </div>
                )}
            </div>

            {/* Mobilní zobrazení - karty */}
            <div className="md:hidden">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-6">
                        <Search className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-base">
                            {searchQuery
                                ? "Nenalezeny žádné produkty odpovídající vašemu hledání"
                                : "Zatím nejsou přidány žádné produkty"}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                                Zobrazit všechny produkty
                            </button>
                        )}
                    </div>
                ) : (
                    filteredProducts.map(product => (
                        <React.Fragment key={product.id}>
                            {editingId === product.id ? (
                                <div className="mb-3">
                                    <EditForm
                                        product={product}
                                        onSave={(formData) => handleInlineUpdate(product.id, formData)}
                                        onCancel={() => setEditingId(null)}
                                        isLoading={isLoading}
                                    />
                                </div>
                            ) : (
                                <ProductCard
                                    product={product}
                                    onEdit={() => setEditingId(product.id)}
                                    onDelete={() => handleDelete(product.id)}
                                    onToggleStock={() => handleToggleStock(product)}
                                />
                            )}
                        </React.Fragment>
                    ))
                )}
            </div>

            {/* Tablet a desktop zobrazení - tabulka */}
            <div className="hidden md:block">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th width="80" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akce</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Název</th>
                                <th width="150" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                                <th width="120" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stav</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? (
                                            <div className="flex flex-col items-center">
                                                <Search className="h-8 w-8 text-gray-400 mb-2" />
                                                <p>Nenalezeny žádné produkty odpovídající vašemu hledání</p>
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="mt-2 text-blue-600 hover:text-blue-800"
                                                >
                                                    Zobrazit všechny produkty
                                                </button>
                                            </div>
                                        ) : (
                                            <p>Zatím nejsou přidány žádné produkty</p>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <React.Fragment key={product.id}>
                                        <tr className={editingId === product.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {/* Na tabletech zobrazíme dropdown, na velkých desktopech ikony */}
                                                <div className="flex justify-center items-center">
                                                    <div className="hidden xl:flex space-x-1">
                                                        <button
                                                            onClick={() => setEditingId(product.id)}
                                                            disabled={isLoading}
                                                            className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 disabled:text-blue-300"
                                                            title="Upravit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            disabled={isLoading}
                                                            className="p-1.5 rounded-full hover:bg-red-50 text-red-600 disabled:text-red-300"
                                                            title="Smazat"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="xl:hidden">
                                                        <ActionsDropdown
                                                            onEdit={() => setEditingId(product.id)}
                                                            onDelete={() => handleDelete(product.id)}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 truncate max-w-xs" title={product.name}>
                                                    {product.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {product.category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleToggleStock(product)}
                                                    disabled={isLoading}
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                                        cursor-pointer transition-colors ${
                                                        product.in_stock
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                                                    title={product.in_stock ? "Kliknutím označíte jako 'Není skladem'" : "Kliknutím označíte jako 'Skladem'"}
                                                >
                                                    {product.in_stock ? 'Skladem' : 'Není skladem'}
                                                </button>
                                            </td>
                                        </tr>
                                        {editingId === product.id && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 bg-blue-50">
                                                    <EditForm
                                                        product={product}
                                                        onSave={(formData) => handleInlineUpdate(product.id, formData)}
                                                        onCancel={() => setEditingId(null)}
                                                        isLoading={isLoading}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminProducts;
