import React, { useState } from 'react';
import Script from 'next/script';
import { ListFilter, Grape, Wine, Martini, TestTube, Box, Package, Search, X, Layout, LayoutList } from 'lucide-react';
import { Product } from '@/types/database';

type ProductListProps = {
    onAddToCart: (productId: number, volume: string | number) => void;
    onRemoveFromCart: (productId: number, volume: string | number) => void;
    cartItems: {[key: string]: number};
    products: Product[];
};

const VolumeOption = {
    LITERS: [3, 5, 10, 20, 30, 50],
    PET: [{ label: '1x balení', value: 'baleni' }],
    DUSIK: [
        { label: 'malý', value: 'maly' },
        { label: 'velký', value: 'velky' }
    ]
};

// Definice barev ikon pro kategorie
const categoryColors = {
    "Všechny": "text-gray-700",
    "Víno": "text-purple-700",
    "Nápoje": "text-blue-700",
    "Ovocné víno": "text-rose-700",
    "Dusík": "text-cyan-700",
    "PET": "text-amber-700"
};

const categoryButtons = [
    { id: 'Všechny', icon: <ListFilter className="h-5 w-5" />, label: 'Vše' },
    { id: 'Víno', icon: <Grape className="h-5 w-5" />, label: 'Víno' },
    { id: 'Nápoje', icon: <Martini className="h-5 w-5" />, label: 'Nápoje' },
    { id: 'Ovocné víno', icon: <Wine className="h-5 w-5" />, label: 'Ovocné' },
    { id: 'Dusík', icon: <TestTube className="h-5 w-5" />, label: 'Dusík' },
    { id: 'PET', icon: <Box className="h-5 w-5" />, label: 'PET' }
];

const ProductList = ({ onAddToCart, onRemoveFromCart, cartItems, products }: ProductListProps) => {
    const [selectedCategory, setSelectedCategory] = useState("Všechny");
    const [searchQuery, setSearchQuery] = useState('');
    const [isGrouped, setIsGrouped] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const openOfferModal = () => {
        setIsOfferModalOpen(true);
        setIsSubmitted(false);
        setSubmitError(null);
    };

    const closeOfferModal = () => {
        setIsOfferModalOpen(false);
        setIsSubmitting(false);
        setSubmitError(null);
    };

    const handleOfferSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        const accessKey = process.env.NEXT_PUBLIC_STATICFORMS_KEY;
        if (!accessKey) {
            setIsSubmitting(false);
            setSubmitError('Formulář není správně nastaven. Zkuste to prosím později.');
            return;
        }

        try {
            const form = e.currentTarget;
            const formData = new FormData(form);
            formData.set('accessKey', accessKey);

            const response = await fetch('https://api.staticforms.dev/submit', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Odeslání se nezdařilo');
            }

            setIsSubmitted(true);
            form.reset();
        } catch (error) {
            setSubmitError('Odeslání se nezdařilo. Zkuste to prosím znovu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getProductIcon = (category: string) => {
        const color = categoryColors[category] || "text-gray-700";

        switch(category) {
            case 'Víno':
                return <Grape className={`h-5 w-5 ${color}`} />;
            case 'Ovocné víno':
                return <Wine className={`h-5 w-5 ${color}`} />;
            case 'Nápoje':
                return <Martini className={`h-5 w-5 ${color}`} />;
            case 'Dusík':
                return <TestTube className={`h-5 w-5 ${color}`} />;
            case 'PET':
                return <Box className={`h-5 w-5 ${color}`} />;
            default:
                return <Package className={`h-5 w-5 ${color}`} />;
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

    const filteredProducts = products.filter(product => {
        const categoryMatch = selectedCategory === "Všechny" ? true : product.category === selectedCategory;
        const searchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
        return categoryMatch && searchMatch;
    });

    const groupedProducts = isGrouped ?
        filteredProducts.reduce((acc, product) => {
            const category = product.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>) : null;

    // Komponenta pro tlačítko objemu - používá se jak v kartě, tak v seznamu
    const VolumeButton = ({ product, volume, label }: { product: Product, volume: string | number, label: string }) => {
        const count = getCartCount(product.id, volume);
        const isInCart = count > 0;

        return (
            <div className="relative flex-1">
                <button
                    onClick={() => product.in_stock && onAddToCart(product.id, volume)}
                    disabled={!product.in_stock}
                    className={`w-full px-2.5 py-1.5 text-xs border rounded-md min-w-[42px]
             transition-colors duration-150 ${
            isInCart
                ? 'bg-blue-600/15 border-blue-500 text-blue-700 hover:bg-blue-600/25'
                : product.in_stock
                    ? 'bg-white text-gray-900 border-gray-300 hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100'
                    : 'opacity-50 cursor-not-allowed text-gray-500'
        }`}    
                >
                    {label}
                </button>
                {isInCart && (
                    <button
                        onClick={() => onRemoveFromCart(product.id, volume)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600
                                 text-white text-[10px] rounded-full w-[18px] h-[18px]
                                 flex items-center justify-center font-medium shadow-sm
                                 transition-colors duration-150 cursor-pointer"
                        title="Kliknutím snížíte počet o 1"
                    >
                        {count}
                    </button>
                )}
            </div>
        );
    };

    // Komponenta pro kartičku produktu (mobilní zobrazení)
    const ProductCard = ({ product }: { product: Product }) => {
        const productButtons = getVolumeButtons(product);

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
                <div className="flex items-start gap-2 mb-2">
                    <div className="mt-0.5">
                        {getProductIcon(product.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-gray-900">{product.name}</h3>
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none font-medium shrink-0 ${
                                product.in_stock
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-50 text-red-800'
                            }`}>
                                {product.in_stock ? "Skladem" : "Není skladem"}
                            </span>
                        </div>
                        <span className="text-xs text-gray-500">{product.category}</span>
                    </div>
                </div>

                {/* Tlačítka objemů - stejná jako v desktop verzi */}
                <div className="flex gap-1.5 mt-3">
                    {productButtons.map(({ label, value }) => (
                        <VolumeButton
                            key={`${product.id}-${value}`}
                            product={product}
                            volume={value}
                            label={label}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Komponenta pro řádek produktu (desktop zobrazení)
    const ProductItem = ({ product }: { product: Product }) => {
        const productButtons = getVolumeButtons(product);

        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center py-2 px-3 bg-white
                        hover:bg-blue-50/80 transition-all duration-150
                        border-b last:border-b-0 hover:shadow-md min-h-[40px] first:pt-1.5">
                <div className="flex items-center flex-grow min-w-0 gap-2">
                    <div className="opacity-75">
                        {getProductIcon(product.category)}
                    </div>

                    <div className="flex-grow min-w-0 flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none font-medium shrink-0 ${
                            product.in_stock
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-50 text-red-800'
                        }`}>
                            {product.in_stock ? "Skladem" : "Není skladem"}
                        </span>
                        {!isGrouped && (
                            <span className="text-xs text-gray-500 truncate">
                                {product.category}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2 sm:mt-0 sm:pl-2 w-full sm:w-auto">
                    {productButtons.map(({ label, value }) => (
                        <VolumeButton
                            key={`${product.id}-${value}`}
                            product={product}
                            volume={value}
                            label={label}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4">
            {/* Sticky header section */}
            <div className="sticky top-16 bg-white z-40 pb-3 pt-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h1 className="text-lg font-bold text-gray-900">Katalog vín a nápojů</h1>
                    <button
                        type="button"
                        onClick={openOfferModal}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700 transition-colors"
                    >
                        Chci cenovou nabídku
                    </button>
                </div>

                {/* Search bar */}
                <div className="mb-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Vyhledat produkt..."
                            className="block w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <div className="mt-1 text-xs text-gray-600">
                            Nalezeno {filteredProducts.length} produktů
                        </div>
                    )}
                </div>

                {/* Category buttons and view toggle - optimalizované pro mobilní zařízení */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-1 overflow-x-auto">
                        {categoryButtons.map((cat) => {
                            const colorClass = categoryColors[cat.id] || "text-gray-700";
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                                        selectedCategory === cat.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-white text-gray-700 hover:bg-gray-100'
                                    } whitespace-nowrap`}
                                    title={cat.id}
                                >
                                    {React.cloneElement(cat.icon, {
                                        className: `h-5 w-5 ${colorClass}`
                                    })}
                                    {/* Zobrazíme popisek pouze na větších obrazovkách */}
                                    <span className="text-xs font-medium hidden sm:inline">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* View toggle button */}
                    <button
                        onClick={() => setIsGrouped(!isGrouped)}
                        className={`
                                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ml-2
                                font-medium transition-all duration-200 text-xs
                                ${isGrouped
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                                min-w-[40px] justify-center
                            `}
                        title={isGrouped ? "Zobrazit jako seznam" : "Seskupit podle kategorií"}
                    >
                        {isGrouped ? (
                            <>
                                <LayoutList className="h-4 w-4" />
                                <span className="hidden sm:inline">Seznam</span>
                            </>
                        ) : (
                            <>
                                <Layout className="h-4 w-4" />
                                <span className="hidden sm:inline">Skupiny</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {isOfferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
                    <Script src="https://www.google.com/recaptcha/api.js" strategy="lazyOnload" />
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full relative">
                        <button
                            type="button"
                            onClick={closeOfferModal}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                            aria-label="Zavřít"
                        >
                            ✕
                        </button>

                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                Žádost o velkoobchodní nabídku
                            </h3>
                            <p className="text-gray-700 mb-6">
                                Zanechte nám prosím kontakt. Ozveme se vám s cenovou nabídkou.
                            </p>

                            {isSubmitted ? (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                    Děkujeme, ozveme se vám co nejdříve.
                                </div>
                            ) : (
                                <form onSubmit={handleOfferSubmit} className="space-y-4">
                                    <input type="hidden" name="subject" value="Žádost o velkoobchodní nabídku" />
                                    <input type="text" name="honeypot" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                                    <div>
                                        <label htmlFor="offerName" className="block text-gray-700 mb-1 font-medium">
                                            Jméno a příjmení *
                                        </label>
                                        <input
                                            id="offerName"
                                            name="name"
                                            type="text"
                                            required
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="offerPhone" className="block text-gray-700 mb-1 font-medium">
                                            Telefon *
                                        </label>
                                        <input
                                            id="offerPhone"
                                            name="phone"
                                            type="tel"
                                            required
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="offerEmail" className="block text-gray-700 mb-1 font-medium">
                                            E-mail *
                                        </label>
                                        <input
                                            id="offerEmail"
                                            name="email"
                                            type="email"
                                            required
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                                        />
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <input
                                            id="offerConsent"
                                            name="consent"
                                            type="checkbox"
                                            required
                                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                                        />
                                        <label htmlFor="offerConsent" className="text-sm text-gray-600">
                                            Souhlasím se zpracováním osobních údajů.
                                        </label>
                                    </div>

                                    <div className="flex justify-center">
                                        <div className="g-recaptcha" data-sitekey="6Leos2ksAAAAALgl7K8hlPM0Mn72MNjG8FxLacvS"></div>
                                    </div>

                                    {submitError && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                                            {submitError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
                                            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {isSubmitting ? 'Odesílám...' : 'Odeslat žádost'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobilní zobrazení - karty */}
            <div className="md:hidden mt-3">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-6">
                        <Search className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-base">
                            {searchQuery
                                ? "Nenalezeny žádné produkty odpovídající vašemu hledání"
                                : "V této kategorii nejsou žádné produkty"}
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
                ) : isGrouped ? (
                    // Seskupené zobrazení karet podle kategorií
                    Object.entries(groupedProducts!).map(([category, categoryProducts]) => (
                        <div key={category} className="mb-4">
                            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 px-1 py-2">
                                {getProductIcon(category)}
                                {category}
                                <span className="text-xs font-normal text-gray-500">
                                    ({categoryProducts.length})
                                </span>
                            </h2>
                            <div className="space-y-3">
                                {categoryProducts.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    // Kartičky bez seskupení
                    <div className="space-y-3">
                        {filteredProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop a tablet zobrazení - seznam */}
            <div className="hidden md:block mt-3">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-6">
                        <Search className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-base">
                            {searchQuery
                                ? "Nenalezeny žádné produkty odpovídající vašemu hledání"
                                : "V této kategorii nejsou žádné produkty"}
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
                ) : isGrouped ? (
                    // Seskupené zobrazení podle kategorií
                    <div className="space-y-4 bg-white rounded-lg border">
                        {Object.entries(groupedProducts!).map(([category, categoryProducts]) => (
                            <div key={category} className="border-t first:border-t-0">
                                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 px-3 py-2">
                                    {getProductIcon(category)}
                                    {category}
                                    <span className="text-xs font-normal text-gray-500">
                                        ({categoryProducts.length})
                                    </span>
                                </h2>
                                <div>
                                    {categoryProducts.map(product => (
                                        <ProductItem key={product.id} product={product} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Seznam bez seskupení
                    <div className="bg-white rounded-lg border">
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
