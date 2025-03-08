'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Building, Phone, MapPin, Home, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ProfileDialogProps, ProfileFormData } from '@/types/auth';

const ProfileDialog = ({ isOpen, onClose }: ProfileDialogProps) => {
    const { profile, updateProfile, user } = useAuth();
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

    // Efekt pro inicializaci formuláře z profilu
    useEffect(() => {
        // Načteme data pouze pokud je dialog otevřený a máme profil
        if (isOpen && profile) {
            setFormData({
                full_name: profile.full_name || '',
                company: profile.company || '',
                phone: profile.phone || '',
                address: profile.address || '',
                city: profile.city || '',
                postal_code: profile.postal_code || ''
            });
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

            // Resetování zprávy o úspěchu po 3 sekundách
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

            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-[101]">
                <div className="bg-white rounded-lg shadow-xl p-6 m-4">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-900">Úprava profilu</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isLoading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Sekce s osobními údaji */}
                        <div className="bg-blue-50 p-5 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2 text-blue-600" />
                                Osobní údaje
                            </h3>

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
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                                Fakturační a dodací údaje
                            </h3>

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

                        <div className="flex justify-between items-center pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={isLoading}
                            >
                                Zrušit
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                        transition-colors disabled:bg-blue-300 flex items-center gap-2"
                                disabled={isLoading}
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
        </>
    );
};

export default ProfileDialog;
