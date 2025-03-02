'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { RegistrationFormData, SignUpData } from '@/types/auth';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

export default function RegisterPage() {
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
    const { signUp, user } = useAuth();
    const router = useRouter();

    // Přesměrovat přihlášeného uživatele
    React.useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

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
            // KLÍČOVÁ ZMĚNA: Úprava URL pro přesměrování po verifikaci emailu
            // Přesměruje na přihlašovací stránku místo automatického přihlášení
            const redirectUrl = `${window.location.origin}/login?verified=true`;

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

            // Vlastní volání Supabase Auth API, aby se zajistilo správné přesměrování
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: signUpData.metadata,
                    emailRedirectTo: redirectUrl
                }
            });

            if (signUpError) {
                throw signUpError;
            }

            if (!data.user) {
                throw new Error('Registrace se nezdařila');
            }

            // Explicitně vytvoříme záznam v tabulce profiles - jako "pojistka" k triggeru
            try {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        email: formData.email,
                        full_name: formData.full_name,
                        company: formData.company,
                        phone: formData.phone,
                        address: formData.address,
                        city: formData.city,
                        postal_code: formData.postal_code,
                        is_admin: false,
                    });

                if (profileError) {
                    console.error('Chyba při vytváření profilu:', profileError);
                }
            } catch (profileError) {
                console.error('Chyba při vytváření profilu:', profileError);
            }

            // Resetujeme formulář
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

            toast.success('Registrace proběhla úspěšně! Zkontrolujte svůj email pro potvrzení účtu.');
            router.push('/register-success');
        } catch (error) {
            console.error('Registration error:', error);
            setError(error instanceof Error ? error.message : 'Chyba při registraci. Zkontrolujte zadané údaje.');
        } finally {
            setIsLoading(false);
        }
    }, [formData, router, validateForm]);

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

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrace nového účtu</h1>

                <form onSubmit={handleSubmit} className="space-y-5">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                        <Link
                            href="/"
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                            Zrušit
                        </Link>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="py-3 px-6 bg-blue-600 text-white font-medium rounded-lg
                                hover:bg-blue-700 transition-colors disabled:bg-gray-400
                                disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Registrace probíhá...' : 'Vytvořit účet'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Již máte účet?{' '}
                    <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                        Přihlaste se
                    </Link>
                </div>
            </div>
        </div>
    );
}
