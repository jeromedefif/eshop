'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ProfileDialogProps, ProfileFormData } from '@/types/auth';
import { supabase } from '@/lib/supabase/client';

const ProfileDialog = ({ isOpen, onClose }: ProfileDialogProps) => {
    const { profile, updateProfile, user, refreshProfile } = useAuth();
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<ProfileFormData>({
        full_name: '',
        company: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
    });

    // Přidáno: indikátor pro sledování, zda již byla synchronizace provedena
    const syncPerformedRef = useRef(false);
    // Přidáno: reference pro sledování, zda je dialog aktivní
    const isActiveRef = useRef(false);

    // Funkce pro kontrolu a příp. doplnění chybějících údajů z metadat
    const syncMissingProfileData = async () => {
        // Přidáno: kontrola, zda je dialog stále otevřený a synchronizace ještě nebyla provedena
        if (!user || !profile || !isOpen || syncPerformedRef.current || !isActiveRef.current) return;

        // Označíme, že synchronizace už proběhla
        syncPerformedRef.current = true;

        // Zjistíme, zda v profilu chybí důležité údaje
        const missingData = !profile.company || !profile.address || !profile.city || !profile.phone;

        if (missingData) {
            try {
                setIsLoading(true);

                // Získáme aktuální metadata uživatele
                const { data } = await supabase.auth.getUser();
                const metadata = data?.user?.user_metadata;

                if (metadata) {
                    // Připravíme objekt s daty k aktualizaci
                    const updateData: any = {};

                    // Přidáme pouze chybějící hodnoty
                    if (!profile.full_name && metadata.full_name) updateData.full_name = metadata.full_name;
                    if (!profile.company && metadata.company) updateData.company = metadata.company;
                    if (!profile.phone && metadata.phone) updateData.phone = metadata.phone;
                    if (!profile.address && metadata.address) updateData.address = metadata.address;
                    if (!profile.city && metadata.city) updateData.city = metadata.city;
                    if (!profile.postal_code && metadata.postal_code) updateData.postal_code = metadata.postal_code;

                    // Aktualizujeme profil, pokud je co aktualizovat
                    if (Object.keys(updateData).length > 0) {
                        await updateProfile(updateData);

                        // KLÍČOVÁ ZMĚNA: Nebudeme volat refreshProfile, abychom zabránili cyklu
                        // await refreshProfile();

                        // Aktualizujeme formulář přímo novými daty
                        setFormData(prev => ({
                            ...prev,
                            ...updateData
                        }));
                    }
                }
            } catch (error) {
                console.error('Error syncing profile data:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Efekt pro otevření/zavření dialogu
    useEffect(() => {
        if (isOpen) {
            // Když se dialog otevře, nastavíme aktivní stav
            isActiveRef.current = true;
            // Resetujeme flag synchronizace při každém otevření
            syncPerformedRef.current = false;
        } else {
            // Když se dialog zavře, zrušíme aktivní stav
            isActiveRef.current = false;
        }
    }, [isOpen]);

    // Efekt pro inicializaci formuláře z profilu
    useEffect(() => {
        // Načteme data pouze pokud je dialog otevřený a máme profil
        if (isOpen && profile && isActiveRef.current) {
            setFormData({
                full_name: profile.full_name || '',
                company: profile.company || '',
                phone: profile.phone || '',
                address: profile.address || '',
                city: profile.city || '',
                postal_code: profile.postal_code || ''
            });

            // Synchronizace se spustí jen při otevření dialogu a jen jednou
            if (!syncPerformedRef.current) {
                syncMissingProfileData();
            }
        }
    }, [profile, isOpen]);

    // Pokud není dialog otevřený, nebudeme nic renderovat
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            await updateProfile(formData);
            setSuccessMessage('Profil byl úspěšně aktualizován');
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error instanceof Error ? error.message : 'Chyba při aktualizaci profilu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />

            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101]">
                <div className="bg-white rounded-lg shadow-xl p-6 m-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Úprava profilu</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isLoading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                                {successMessage}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4">
                            <div className="space-x-3">
                                {!successMessage ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
                                            disabled={isLoading}
                                        >
                                            Zrušit
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                                     transition-colors disabled:bg-blue-300"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Ukládám...' : 'Uložit změny'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
                                                 transition-colors"
                                    >
                                        Zavřít
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default ProfileDialog;
