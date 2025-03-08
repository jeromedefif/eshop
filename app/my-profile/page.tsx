'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Building, Phone, MapPin, Home, CheckCircle, Save, Mail } from 'lucide-react';
import { toast } from 'react-toastify';

export default function MyProfilePage() {
    const { user, profile, updateProfile, refreshProfile } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        company: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
    });

    // Přidané stavy pro sledování změn formuláře
    const [hasChanges, setHasChanges] = useState(false);
    const [originalData, setOriginalData] = useState<typeof formData | null>(null);

    // Přesměrování nepřihlášeného uživatele
    useEffect(() => {
        if (!user) {
            router.push('/login');
        }
    }, [user, router]);

    // Načtení dat profilu
    useEffect(() => {
        if (profile) {
            const profileData = {
                full_name: profile.full_name || '',
                company: profile.company || '',
                phone: profile.phone || '',
                address: profile.address || '',
                city: profile.city || '',
                postal_code: profile.postal_code || ''
            };

            // Nastavení dat formuláře
            setFormData(profileData);

            // Uložení původních dat pro porovnání změn
            setOriginalData(profileData);

            // Reset stavu změn
            setHasChanges(false);
        }
    }, [profile]);

    // Effect pro detekci změn ve formuláři
    useEffect(() => {
        if (originalData) {
            // Porovnání aktuálních hodnot s původními
            const isDifferent =
                formData.full_name !== originalData.full_name ||
                formData.company !== originalData.company ||
                formData.phone !== originalData.phone ||
                formData.address !== originalData.address ||
                formData.city !== originalData.city ||
                formData.postal_code !== originalData.postal_code;

            setHasChanges(isDifferent);
        }
    }, [formData, originalData]);

    // Aktualizace dat při změně v inputech
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Zpracování formuláře
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            await updateProfile(formData);
            await refreshProfile();

            // Zobrazíme zprávu o úspěchu
            setSuccessMessage('Profil byl úspěšně aktualizován');
            toast.success('Profil byl úspěšně aktualizován');

            // Aktualizujeme originalData - důležité pro reset stavu tlačítka
            setOriginalData({...formData});
            setHasChanges(false);

            // Zpráva zmizí po 3 sekundách
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error instanceof Error ? error.message : 'Chyba při aktualizaci profilu');
            toast.error('Nepodařilo se aktualizovat profil');
        } finally {
            setIsLoading(false);
        }
    };

    // Pokud uživatel není přihlášen nebo profil se načítá, zobrazíme loading
    if (!user || !profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
                    <p className="text-gray-900">Načítání profilu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na katalog
                    </Link>
                </div>

                <div className="mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Můj profil</h1>
                    <p className="text-gray-600">Aktualizujte své kontaktní údaje a dodací adresu pro objednávky.</p>
                </div>

                {/* Email uživatele - needitovatelné pole */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-500 mr-2" />
                        <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium text-gray-900">{user.email}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sekce s osobními údaji */}
                    <div className="bg-blue-50 p-5 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="w-5 h-5 mr-2 text-blue-600" />
                            Osobní údaje
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-1">
                                    Jméno a příjmení
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Building className="w-4 h-4 mr-1 text-gray-600" />
                                    Název firmy
                                </label>
                                <input
                                    type="text"
                                    id="company"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Phone className="w-4 h-4 mr-1 text-gray-600" />
                                    Telefon
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sekce s adresou */}
                    <div className="bg-green-50 p-5 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-green-600" />
                            Fakturační a dodací údaje
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Home className="w-4 h-4 mr-1 text-gray-600" />
                                    Dodací adresa (ulice a číslo popisné)
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1 text-gray-600" />
                                        Město
                                    </label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-900 mb-1">
                                        PSČ
                                    </label>
                                    <input
                                        type="text"
                                        id="postal_code"
                                        name="postal_code"
                                        value={formData.postal_code || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mr-2 text-red-500">⚠️</div>
                            <div>{error}</div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t">
                        {/* Přidané tlačítko "Zpět na katalog" */}
                        <Link
                            href="/"
                            className="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Zpět na katalog
                        </Link>

                        <button
                            type="submit"
                            className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                                hasChanges
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-blue-300 text-white cursor-not-allowed"
                            }`}
                            disabled={isLoading || !hasChanges}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Ukládám...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Uložit změny
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
