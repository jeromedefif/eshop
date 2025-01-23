'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ProfileDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

const ProfileDialog = ({ isOpen, onClose }: ProfileDialogProps) => {
    const { profile, updateProfile } = useAuth();
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        company: '',
        phone: '',
        address: '',
        city: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                company: profile.company || '',
                phone: profile.phone || '',
                address: profile.address || '',
                city: profile.city || ''
            });
        }
    }, [profile]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            await updateProfile({
                full_name: formData.full_name,
                company: formData.company,
                phone: formData.phone,
                address: formData.address,
                city: formData.city
            });

            setSuccessMessage('Profil byl úspěšně aktualizován');
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setError(error.message || 'Chyba při aktualizaci profilu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
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
