'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { RegistrationFormData, SignUpData } from '@/types/auth';
import { ArrowLeft, Mail, Building, Phone, MapPin, Home, User, Lock, BookOpen, CheckCircle, XCircle } from 'lucide-react';
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
    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
    const { signUp, user } = useAuth();
    const router = useRouter();

    // Přesměrovat přihlášeného uživatele
    React.useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    // Efekt pro kontrolu shody hesel v reálném čase
    useEffect(() => {
        // Kontrolujeme pouze pokud obě hesla byla zadána
        if (formData.password && formData.confirmPassword) {
            setPasswordsMatch(formData.password === formData.confirmPassword);
        } else if (formData.confirmPassword) {
            // Pokud je vyplněno pouze potvrzovací heslo
            setPasswordsMatch(false);
        } else {
            // Pokud potvrzovací heslo není vyplněno, nerádíme stav
            setPasswordsMatch(null);
        }
    }, [formData.password, formData.confirmPassword]);

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
            const redirectUrl = `https://www.beginy.cz/login?verified=true`;

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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Registrace nového účtu</h1>
                    <p className="text-gray-600">Vytvořte si účet pro přístup k B2B katalogu produktů VINARIA s.r.o.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sekce s přihlašovacími údaji */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                            Přihlašovací údaje
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Mail className="w-4 h-4 mr-1 text-gray-600" />
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
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        <Lock className="w-4 h-4 mr-1 text-gray-600" />
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
                                    <p className="text-xs text-gray-500 mt-1">Minimálně 6 znaků</p>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        <Lock className="w-4 h-4 mr-1 text-gray-600" />
                                        Potvrzení hesla*
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none text-gray-900 ${
                                                passwordsMatch === true
                                                    ? 'border-green-500 focus:ring-green-500'
                                                    : passwordsMatch === false
                                                        ? 'border-red-500 focus:ring-red-500'
                                                        : 'focus:ring-blue-500'
                                            }`}
                                            required
                                            disabled={isLoading}
                                        />
                                        {passwordsMatch !== null && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {passwordsMatch ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {passwordsMatch === false && (
                                        <p className="text-xs text-red-500 mt-1">Hesla se neshodují</p>
                                    )}
                                    {passwordsMatch === true && (
                                        <p className="text-xs text-green-500 mt-1">Hesla se shodují</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sekce s osobními údaji */}
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="w-5 h-5 mr-2 text-green-600" />
                            Kontaktní údaje
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-1">
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
                                <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Building className="w-4 h-4 mr-1 text-gray-600" />
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
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Phone className="w-4 h-4 mr-1 text-gray-600" />
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
                        </div>
                    </div>

                    {/* Sekce s adresou */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-yellow-600" />
                            Fakturační a dodací údaje
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Home className="w-4 h-4 mr-1 text-gray-600" />
                                    Dodací adresa (ulice a číslo popisné)*
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    placeholder="např. Vinařská 123"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1 text-gray-600" />
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
                                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-900 mb-1">
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
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 mr-2 text-red-500">⚠️</div>
                            <div>{error}</div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                        <Link
                            href="/"
                            className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Zrušit
                        </Link>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="py-3 px-6 bg-blue-600 text-white font-medium rounded-lg
                                hover:bg-blue-700 transition-colors disabled:bg-gray-400
                                disabled:cursor-not-allowed flex items-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Registrace probíhá...
                                </>
                            ) : 'Vytvořit účet'}
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
