'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type {
    RegistrationDialogProps,
    RegistrationFormData,
    SignUpData
} from '@/types/auth';

const RegistrationDialog = ({ isOpen, onClose }: RegistrationDialogProps) => {
    const [formData, setFormData] = useState<RegistrationFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        company: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
    });

    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const { signUp } = useAuth();

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const validateForm = useCallback((): string | null => {
        if (!formData.email || !formData.password || !formData.confirmPassword ||
            !formData.full_name || !formData.company || !formData.phone ||
            !formData.address || !formData.city) {
            return 'Vyplňte prosím všechna povinná pole';
        }

        if (formData.password !== formData.confirmPassword) {
            return 'Hesla se neshodují';
        }

        if (formData.password.length < 6) {
            return 'Heslo musí mít alespoň 6 znaků';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return 'Zadejte platnou emailovou adresu';
        }

        const phoneRegex = /^[0-9+\s-]{9,}$/;
        if (!phoneRegex.test(formData.phone)) {
            return 'Zadejte platné telefonní číslo';
        }

        return null;
    }, [formData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const signUpData: SignUpData = {
                email: formData.email,
                password: formData.password,
                metadata: {
                    full_name: formData.full_name,
                    company: formData.company,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    postal_code: formData.postal_code
                }
            };

            await signUp(signUpData);

            setFormData({
                email: '',
                password: '',
                confirmPassword: '',
                full_name: '',
                company: '',
                phone: '',
                address: '',
                city: '',
                postal_code: ''
            });

            onClose();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Chyba při registraci. Zkontrolujte zadané údaje.');
            console.error('Registration error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [formData, onClose, signUp, validateForm]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (!isLoading && e.target === e.currentTarget) {
            onClose();
        }
    }, [isLoading, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={handleBackdropClick}
            />

            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101]">
                <div className="bg-white rounded-lg shadow-xl p-6 m-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Registrace nového účtu</h2>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            title="Zavřít"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                                Email*
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                placeholder="vas@email.cz"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                                Heslo*
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                minLength={6}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
                                Potvrzení hesla*
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-900">
                                Jméno a příjmení*
                            </label>
                            <input
                                type="text"
                                id="full_name"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="company" className="block text-sm font-medium text-gray-900">
                                Název firmy*
                            </label>
                            <input
                                type="text"
                                id="company"
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-900">
                                Telefon*
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                placeholder="123456789"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-900">
                                Adresa*
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-900">
                                Město*
                            </label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-900">
                                PSČ
                            </label>
                            <input
                                type="text"
                                id="postal_code"
                                name="postal_code"
                                value={formData.postal_code}
                                onChange={handleInputChange}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                placeholder="12345"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg
                                     hover:bg-blue-700 transition-colors disabled:bg-gray-400
                                     disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Registrace probíhá...' : 'Vytvořit účet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default RegistrationDialog;
