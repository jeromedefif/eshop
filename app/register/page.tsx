'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { RegistrationFormData, SignUpData } from '@/types/auth';
import { Mail, Building, Phone, MapPin, User, Lock, BookOpen, CheckCircle, XCircle, Truck, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthPageShell from '@/components/AuthPageShell';

export default function RegisterPage() {
    const defaultCountry = 'Česká republika';
    const [formData, setFormData] = useState<RegistrationFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        company: '',
        phone: '',
        company_id: '',
        vat_id: '',
        billing_address: '',
        billing_city: '',
        billing_postal_code: '',
        billing_country: defaultCountry,
        shipping_same_as_billing: true,
        shipping_company: '',
        shipping_contact_name: '',
        shipping_address: '',
        shipping_city: '',
        shipping_postal_code: '',
        shipping_country: defaultCountry,
        delivery_instructions: ''
    });

    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
    const { user } = useAuth();
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

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const nextValue = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
            ? e.target.checked
            : value;
        setFormData(prev => ({
            ...prev,
            [name]: nextValue
        }));
    }, []);

    const validateForm = useCallback((): string | null => {
        if (!formData.email || !formData.password || !formData.confirmPassword ||
            !formData.full_name || !formData.company || !formData.phone ||
            !formData.company_id || !formData.billing_address || !formData.billing_city ||
            !formData.billing_postal_code || !formData.billing_country) {
            return 'Vyplňte prosím všechna povinná pole';
        }

        if (!formData.shipping_same_as_billing && (
            !formData.shipping_address || !formData.shipping_city ||
            !formData.shipping_postal_code || !formData.shipping_country
        )) {
            return 'Vyplňte prosím všechny povinné dodací údaje';
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

            const shippingData = formData.shipping_same_as_billing ? {
                shipping_company: formData.company,
                shipping_contact_name: formData.full_name,
                shipping_address: formData.billing_address,
                shipping_city: formData.billing_city,
                shipping_postal_code: formData.billing_postal_code,
                shipping_country: formData.billing_country,
            } : {
                shipping_company: formData.shipping_company,
                shipping_contact_name: formData.shipping_contact_name,
                shipping_address: formData.shipping_address,
                shipping_city: formData.shipping_city,
                shipping_postal_code: formData.shipping_postal_code,
                shipping_country: formData.shipping_country,
            };

            const signUpData: SignUpData = {
                email: formData.email,
                password: formData.password,
                metadata: {
                    full_name: formData.full_name,
                    company: formData.company,
                    phone: formData.phone,
                    // Legacy address fields remain synchronized for older parts of the app.
                    address: formData.billing_address,
                    city: formData.billing_city,
                    postal_code: formData.billing_postal_code,
                    company_id: formData.company_id,
                    vat_id: formData.vat_id,
                    billing_address: formData.billing_address,
                    billing_city: formData.billing_city,
                    billing_postal_code: formData.billing_postal_code,
                    billing_country: formData.billing_country,
                    shipping_same_as_billing: formData.shipping_same_as_billing,
                    ...shippingData,
                    delivery_instructions: formData.delivery_instructions,
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
                        address: formData.billing_address,
                        city: formData.billing_city,
                        postal_code: formData.billing_postal_code,
                        company_id: formData.company_id,
                        vat_id: formData.vat_id,
                        billing_address: formData.billing_address,
                        billing_city: formData.billing_city,
                        billing_postal_code: formData.billing_postal_code,
                        billing_country: formData.billing_country,
                        shipping_same_as_billing: formData.shipping_same_as_billing,
                        ...shippingData,
                        delivery_instructions: formData.delivery_instructions,
                        show_ordering_help: true,
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
                company_id: '',
                vat_id: '',
                billing_address: '',
                billing_city: '',
                billing_postal_code: '',
                billing_country: defaultCountry,
                shipping_same_as_billing: true,
                shipping_company: '',
                shipping_contact_name: '',
                shipping_address: '',
                shipping_city: '',
                shipping_postal_code: '',
                shipping_country: defaultCountry,
                delivery_instructions: ''
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
        <AuthPageShell active="register" width="4xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
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

                    {/* Firemní a fakturační údaje */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-yellow-600" />
                            Firemní a fakturační údaje
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                        <Building className="w-4 h-4 mr-1 text-gray-600" />
                                        Název firmy*
                                    </label>
                                    <input type="text" id="company" name="company" value={formData.company} onChange={handleInputChange}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        required disabled={isLoading} />
                                </div>
                                <div>
                                    <label htmlFor="company_id" className="block text-sm font-medium text-gray-900 mb-1">IČO*</label>
                                    <input type="text" id="company_id" name="company_id" value={formData.company_id} onChange={handleInputChange}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        required disabled={isLoading} />
                                </div>
                                <div>
                                    <label htmlFor="vat_id" className="block text-sm font-medium text-gray-900 mb-1">DIČ</label>
                                    <input type="text" id="vat_id" name="vat_id" value={formData.vat_id} onChange={handleInputChange}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        disabled={isLoading} />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="billing_address" className="block text-sm font-medium text-gray-900 mb-1">
                                    Fakturační adresa (ulice a číslo popisné)*
                                </label>
                                <input
                                    type="text"
                                    id="billing_address"
                                    name="billing_address"
                                    value={formData.billing_address}
                                    onChange={handleInputChange}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    placeholder="např. Vinařská 123"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="billing_city" className="block text-sm font-medium text-gray-900 mb-1">Město*</label>
                                    <input
                                        type="text"
                                        id="billing_city"
                                        name="billing_city"
                                        value={formData.billing_city}
                                        onChange={handleInputChange}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="billing_postal_code" className="block text-sm font-medium text-gray-900 mb-1">PSČ*</label>
                                    <input
                                        type="text"
                                        id="billing_postal_code"
                                        name="billing_postal_code"
                                        value={formData.billing_postal_code}
                                        onChange={handleInputChange}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                        placeholder="12345"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="billing_country" className="block text-sm font-medium text-gray-900 mb-1">Země*</label>
                                <input type="text" id="billing_country" name="billing_country" value={formData.billing_country} onChange={handleInputChange}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                    {/* Dodací údaje */}
                    <div className="bg-cyan-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Truck className="w-5 h-5 mr-2 text-cyan-700" />
                            Dodací údaje
                        </h2>

                        <label className="flex items-start gap-3 rounded-lg border border-cyan-200 bg-white p-3 cursor-pointer">
                            <input type="checkbox" name="shipping_same_as_billing" checked={formData.shipping_same_as_billing}
                                onChange={handleInputChange} disabled={isLoading} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Dodací adresa je stejná jako fakturační</span>
                        </label>

                        {!formData.shipping_same_as_billing && (
                            <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="shipping_company" className="block text-sm font-medium text-gray-900 mb-1">Firma pro dodání</label>
                                        <input type="text" id="shipping_company" name="shipping_company" value={formData.shipping_company} onChange={handleInputChange}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" disabled={isLoading} />
                                    </div>
                                    <div>
                                        <label htmlFor="shipping_contact_name" className="block text-sm font-medium text-gray-900 mb-1">Kontaktní osoba</label>
                                        <input type="text" id="shipping_contact_name" name="shipping_contact_name" value={formData.shipping_contact_name} onChange={handleInputChange}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" disabled={isLoading} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-900 mb-1">Dodací adresa*</label>
                                    <input type="text" id="shipping_address" name="shipping_address" value={formData.shipping_address} onChange={handleInputChange}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" required disabled={isLoading} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="shipping_city" className="block text-sm font-medium text-gray-900 mb-1">Město*</label>
                                        <input type="text" id="shipping_city" name="shipping_city" value={formData.shipping_city} onChange={handleInputChange}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" required disabled={isLoading} />
                                    </div>
                                    <div>
                                        <label htmlFor="shipping_postal_code" className="block text-sm font-medium text-gray-900 mb-1">PSČ*</label>
                                        <input type="text" id="shipping_postal_code" name="shipping_postal_code" value={formData.shipping_postal_code} onChange={handleInputChange}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" required disabled={isLoading} />
                                    </div>
                                    <div>
                                        <label htmlFor="shipping_country" className="block text-sm font-medium text-gray-900 mb-1">Země*</label>
                                        <input type="text" id="shipping_country" name="shipping_country" value={formData.shipping_country} onChange={handleInputChange}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" required disabled={isLoading} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label htmlFor="delivery_instructions" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                <FileText className="w-4 h-4 mr-1 text-gray-600" />
                                Pokyny k doručení
                            </label>
                            <textarea id="delivery_instructions" name="delivery_instructions" value={formData.delivery_instructions}
                                onChange={handleInputChange} rows={3} disabled={isLoading}
                                className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                placeholder="Např. kontaktovat před závozem, provozní doba..." />
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
                            href="/produkty"
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
        </AuthPageShell>
    );
}
