import React, { useState } from 'react';
import { ListFilter, Grape, Wine, Martini, TestTube, Box, Package, Search, X, Layout, LayoutList } from 'lucide-react';

type Product = {
    id: number;
    name: string;
    category: string;
    in_stock: boolean;
    created_at?: string;
};

type ProductListProps = {
    onAddToCart: (productId: number, volume: number | string) => void;
    cartItems: {[key: string]: number};
    products: Product[];
};

const VolumeOption = {
    LITERS: [5, 10, 20, 30, 50],
    PET: [{ label: '1x balení', value: 'baleni' }],
    DUSIK: [
        { label: 'malý', value: 'maly' },
        { label: 'velký', value: 'velky' }
    ]
};

const categoryButtons = [
    { id: 'Všechny', icon: <ListFilter className="h-6 w-6" />, label: 'Vše' },
    { id: 'Víno', icon: <Grape className="h-6 w-6" />, label: 'Víno' },
    { id: 'Nápoje', icon: <Martini className="h-6 w-6" />, label: 'Nápoje' },
    { id: 'Ovocné víno', icon: <Wine className="h-6 w-6" />, label: 'Ovocné' },
    { id: 'Dusík', icon: <TestTube className="h-6 w-6" />, label: 'Dusík' },
    { id: 'PET', icon: <Box className="h-6 w-6" />, label: 'PET' }
];

const ProductList = ({ onAddToCart, cartItems, products }: ProductListProps) => {
    const [selectedCategory, setSelectedCategory] = useState("Všechny");
    const [searchQuery, setSearchQuery] = useState('');
    const [isGrouped, setIsGrouped] = useState(false);

    const getProductIcon = (category: string) => {
        switch(category) {
            case 'Víno':
                return <Grape className="h-6 w-6 text-gray-800" />;
            case 'Ovocné víno':
                return <Wine className="h-6 w-6 text-gray-800" />;
            case 'Nápoje':
                return <Martini className="h-6 w-6 text-gray-800" />;
            case 'Dusík':
                return <TestTube className="h-6 w-6 text-gray-800" />;
            case 'PET':
                return <Box className="h-6 w-6 text-gray-800" />;
            default:
                return <Package className="h-6 w-6 text-gray-800" />;
        }
    };

    const getVolumeButtons = (product: Product) => {
        switch(product.category) {
            case 'PET':
                return VolumeOption.PET;
            case 'Dusík':
                return VolumeOption.DUSIK;
            default:
                return VolumeOption.LITERS.map(vol => ({ label: `${vol}L`, value: vol }));
        }
    };

    const getCartCount = (productId: number, volume: number | string) => {
        const key = `${productId}-${volume}`;
        return cartItems[key] || 0;
    };

    // Filtrování produktů
    const filteredProducts = products.filter(product => {
        const categoryMatch = selectedCategory === "Všechny" ? true : product.category === selectedCategory;
        const searchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
        return categoryMatch && searchMatch;
    });

    // Seskupení produktů podle kategorie
    const groupedProducts = isGrouped ? 
        filteredProducts.reduce((acc, product) => {
            const category = product.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>) : null;

    // Komponenta pro renderování jednoho produktu
    const ProductItem = ({ product }: { product: Product }) => (
        <div className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="mr-4">
                {getProductIcon(product.category)}
            </div>

            <div className="flex-grow">
                <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.in_stock
                            ? 'bg-green-100 text-green-900'
                            : 'bg-red-100 text-red-900'
                    }`}>
                        {product.in_stock ? "Skladem" : "Není skladem"}
                    </span>
                </div>
                {!isGrouped && (
                    <p className="text-sm text-gray-700">
                        Kategorie: {product.category}
                    </p>
                )}
            </div>

            <div className="flex items-center space-x-2">
                {getVolumeButtons(product).map(({ label, value }) => (
                    <div key={`${product.id}-${value}`} className="relative">
                        <button
                            onClick={() => product.in_stock && onAddToCart(product.id, value)}
                            disabled={!product.in_stock}
                            className={`w-16 px-2 py-1 text-sm border rounded-lg ${
                                product.in_stock
                                    ? 'bg-white text-gray-900 border-gray-300 hover:bg-blue-50 active:bg-blue-100'
                                    : 'opacity-50 cursor-not-allowed text-gray-500'
                            }`}
                        >
                            {label}
                        </button>
                        {getCartCount(product.id, value) > 0 && (
                            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                {getCartCount(product.id, value)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {/* Sticky header section */}
            <div className="sticky top-16 bg-white z-40 pb-4 pt-4 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Katalog produktů</h1>

                {/* Search bar */}
                <div className="mb-4">
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

                {/* Category buttons and view toggle */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-2 overflow-x-auto">
                        {categoryButtons.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                                    selectedCategory === cat.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                } whitespace-nowrap`}
                                title={cat.id}
                            >
                                {cat.icon}
                                <span className="text-xs mt-1">{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* View toggle button */}
                    <button
                        onClick={() => setIsGrouped(!isGrouped)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg ml-2
                            font-medium transition-all duration-200
                            ${isGrouped 
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                            min-w-[44px] justify-center
                        `}
                        title={isGrouped ? "Zobrazit jako seznam" : "Seskupit podle kategorií"}
                    >
                        {isGrouped ? (
                            <>
                                <LayoutList className="h-5 w-5" />
                                <span className="hidden sm:inline">Seznam</span>
                            </>
                        ) : (
                            <>
                                <Layout className="h-5 w-5" />
                                <span className="hidden sm:inline">Skupiny</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Products list */}
            <div className="mt-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-8">
                        <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 text-lg">
                            {searchQuery
                                ? "Nenalezeny žádné produkty odpovídající vašemu hledání"
                                : "V této kategorii nejsou žádné produkty"}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-blue-600 hover:text-blue-800"
                            >
                                Zobrazit všechny produkty
                            </button>
                        )}
                    </div>
                ) : isGrouped ? (
                    // Grouped view
                    <div className="space-y-6">
                        {Object.entries(groupedProducts!).map(([category, categoryProducts]) => (
                            <div key={category} className="space-y-2">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 pb-2">
                                    {getProductIcon(category)}
                                    {category}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({categoryProducts.length})
                                    </span>
                                </h2>
                                <div className="space-y-2 ml-2">
                                    {categoryProducts.map(product => (
                                        <ProductItem key={product.id} product={product} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // List view
                    <div className="space-y-2">
                        {filteredProducts.map(product => (
                            <ProductItem key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductList;