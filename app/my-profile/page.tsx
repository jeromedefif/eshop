'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProfileFormData } from '@/types/auth';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';

export default function MyProfilePage() {
    const { profile, updateProfile, user, refreshProfile } = useAuth();
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const [formData, setFormData] = useState<ProfileFormData>({
        full_name: '',
        company: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
    });

    // Přesměrovat nepřihlášeného uživatele
    useEffect(() => {
        if (!user) {
            router.push('/login');
        }
    }, [user, router]);

    // Načtení dat profilu
    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                company: profile.company || '',
                phone: profile.phone || '',
                address: profile.address || '',
                city: profile.city || '',
                postal_code: profile.postal_code || ''
            });
        } else if (user) {
            // Pokud máme uživatele, ale nemáme profil, zkusíme ho načíst
            refreshProfile();

            // Jako záložní plán, zkusíme načíst metadata přímo z auth
            const loadUserMetadata = async () => {
                try {
                    const { data } = await supabase.auth.getUser();
                    if (data?.user?.user_metadata) {
                        const metadata = data.user.user_metadata;
                        setFormData({
                            full_name: metadata.full_name || '',
                            company: metadata.company || '',
                            phone: metadata.phone || '',
                            address: metadata.address || '',
                            city: metadata.city || '',
                            postal_code: metadata.postal_code || ''
                        });
                    }
                } catch (error) {
                    console.error('Chyba při načítání metadat uživatele:', error);
                }
            };

            loadUserMetadata();
        }
    }, [profile, user, refreshProfile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            // 1. Aktualizovat profil v tabulce profiles
            await updateProfile(formData);

            // 2. Aktualizovat metadata v auth systému - "dvojité jištění"
            if (user) {
                try {
                    const { error: metadataError } = await supabase.auth.updateUser({
                        data: {
                            full_name: formData.full_name,
                            company: formData.company,
                            phone: formData.phone,
                            address: formData.address,
                            city: formData.city,
                            postal_code: formData.postal_code
                        }
                    });

                    if (metadataError) {
                        console.error('Chyba při aktualizaci metadat:', metadataError);
                        // Pokračujeme i přes chybu, protože hlavní profil byl aktualizován
                    }
                } catch (metadataError) {
                    console.error('Chyba při aktualizaci metadat:', metadataError);
                    // Pokračujeme i přes chybu
                }
            }

            setSuccessMessage('Profil byl úspěšně aktualizován');
            toast.success('Profil byl úspěšně aktualizován');
            window.scrollTo(0, 0);

            // Po 3 sekundách skryjeme zprávu o úspěchu
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);

            // Obnovit data profilu
            refreshProfile();
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error instanceof Error ? error.message : 'Chyba při aktualizaci profilu');
            toast.error('Chyba při aktualizaci profilu');
            window.scrollTo(0, 0);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Přesměrování na přihlašovací stránku...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile && !formData.full_name) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Načítání profilu...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na katalog
                    </Link>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Můj profil</h1>

                {/* Zprávy o úspěchu/chybě */}
                {successMessage && (
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm mb-6">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={user.email || ''}
                            disabled
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
                        />
                        <p className="mt-1 text-xs text-gray-500">Email nelze změnit</p>
                    </div>

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
                        <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-1">
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
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
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

                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">
                            Adresa
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

                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1">
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

                    <div className="flex justify-between items-center pt-4">
                        <Link
                            href="/"
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                            Zrušit
                        </Link>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                     transition-colors disabled:bg-blue-300"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Ukládám...' : 'Uložit změny'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
