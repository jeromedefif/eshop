'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Building, CheckCircle, Eye, FileText, LockKeyhole, Mail, MapPin, Phone, Save, Truck, User } from 'lucide-react';
import CustomerPageState from '@/components/CustomerPageState';
import CustomerPageShell from '@/components/CustomerPageShell';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_COUNTRY = 'Česká republika';
const emptyForm = {
    full_name: '', company: '', phone: '', company_id: '', vat_id: '',
    billing_address: '', billing_city: '', billing_postal_code: '', billing_country: DEFAULT_COUNTRY,
    shipping_same_as_billing: true, shipping_company: '', shipping_contact_name: '',
    shipping_address: '', shipping_city: '', shipping_postal_code: '', shipping_country: DEFAULT_COUNTRY,
    delivery_instructions: '', show_ordering_help: true,
};
type ProfileFormData = typeof emptyForm;
const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100';

export default function MyProfilePage() {
    const { user, profile, updateProfile } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<ProfileFormData>(emptyForm);
    const [originalData, setOriginalData] = useState<ProfileFormData | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => { if (!user) router.push('/login'); }, [user, router]);

    useEffect(() => {
        if (!profile) return;
        const billingAddress = profile.billing_address || profile.address || '';
        const billingCity = profile.billing_city || profile.city || '';
        const billingPostalCode = profile.billing_postal_code || profile.postal_code || '';
        const profileData: ProfileFormData = {
            full_name: profile.full_name || '', company: profile.company || '', phone: profile.phone || '',
            company_id: profile.company_id || '', vat_id: profile.vat_id || '',
            billing_address: billingAddress, billing_city: billingCity, billing_postal_code: billingPostalCode,
            billing_country: profile.billing_country || DEFAULT_COUNTRY,
            shipping_same_as_billing: profile.shipping_same_as_billing !== false,
            shipping_company: profile.shipping_company || profile.company || '',
            shipping_contact_name: profile.shipping_contact_name || profile.full_name || '',
            shipping_address: profile.shipping_address || billingAddress,
            shipping_city: profile.shipping_city || billingCity,
            shipping_postal_code: profile.shipping_postal_code || billingPostalCode,
            shipping_country: profile.shipping_country || profile.billing_country || DEFAULT_COUNTRY,
            delivery_instructions: profile.delivery_instructions || '',
            show_ordering_help: profile.show_ordering_help !== false,
        };
        setFormData(profileData);
        setOriginalData(profileData);
    }, [profile]);

    const hasChanges = useMemo(
        () => Boolean(originalData && JSON.stringify(formData) !== JSON.stringify(originalData)),
        [formData, originalData]
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const nextValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
        setFormData(current => ({ ...current, [name]: nextValue }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(''); setSuccessMessage(''); setIsLoading(true);
        const normalizedData = formData.shipping_same_as_billing ? {
            ...formData,
            shipping_company: formData.company,
            shipping_contact_name: formData.full_name,
            shipping_address: formData.billing_address,
            shipping_city: formData.billing_city,
            shipping_postal_code: formData.billing_postal_code,
            shipping_country: formData.billing_country,
        } : formData;
        try {
            await updateProfile(normalizedData);
            setFormData(normalizedData); setOriginalData(normalizedData);
            setSuccessMessage('Profil byl úspěšně aktualizován.');
            window.setTimeout(() => setSuccessMessage(''), 3000);
        } catch (updateError) {
            console.error('Error updating profile:', updateError);
            setError(updateError instanceof Error ? updateError.message : 'Chyba při aktualizaci profilu.');
        } finally { setIsLoading(false); }
    };

    const handlePasswordChange = async (event: React.FormEvent) => {
        event.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        const accountEmail = user?.email;
        const accountUserId = user?.id;

        if (!accountEmail || !accountUserId) {
            setPasswordError('K účtu není přiřazený e-mail. Kontaktujte prosím administrátora.');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Nové heslo musí mít alespoň 8 znaků.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Nové heslo a jeho potvrzení se neshodují.');
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordError('Nové heslo musí být odlišné od současného hesla.');
            return;
        }

        setIsChangingPassword(true);
        try {
            const { data: verification, error: verificationError } = await supabase.auth.signInWithPassword({
                email: accountEmail,
                password: currentPassword,
            });

            if (verificationError || verification.user?.id !== accountUserId) {
                throw new Error('Současné heslo není správné.');
            }

            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                if (updateError.message.toLowerCase().includes('password')) {
                    throw new Error('Nové heslo nesplňuje bezpečnostní požadavky. Zvolte prosím silnější heslo.');
                }
                throw updateError;
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordSuccess('Heslo bylo úspěšně změněno. Nyní vás bezpečně odhlásíme.');

            await supabase.auth.signOut({ scope: 'global' });
            window.location.replace('/login?reset=success');
        } catch (changeError) {
            console.error('Password change error:', changeError);
            setPasswordError(changeError instanceof Error ? changeError.message : 'Heslo se nepodařilo změnit.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!user || !profile) return <CustomerPageState loading title="Načítáme váš profil" description="Kontrolujeme kontaktní, fakturační a dodací údaje." />;

    return (
        <CustomerPageShell width="5xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="mb-6 border-b border-slate-200 pb-5">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">Můj profil</h1>
                    <p className="mt-2 text-slate-600">Udržujte aktuální kontaktní, fakturační a dodací údaje pro nové objednávky.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Section title="Kontaktní údaje" icon={<User className="h-5 w-5 text-blue-600" />} className="border-blue-100 bg-blue-50/70">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Jméno a příjmení" name="full_name"><input id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                            <Field label="Telefon" name="phone" icon={<Phone className="h-4 w-4" />}><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                            <div className="rounded-lg border border-blue-100 bg-white/80 px-4 py-3 md:col-span-2">
                                <div className="flex items-center gap-2 text-sm text-slate-500"><Mail className="h-4 w-4" /> Email přihlašovacího účtu</div>
                                <a href={`mailto:${user.email}`} className="mt-1 inline-block font-medium text-blue-700 hover:underline">{user.email}</a>
                            </div>
                        </div>
                    </Section>

                    <Section title="Firma a fakturační údaje" icon={<Building className="h-5 w-5 text-emerald-700" />} className="border-emerald-100 bg-emerald-50/70">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Název firmy" name="company"><input id="company" name="company" value={formData.company} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                            <Field label="IČO" name="company_id"><input id="company_id" name="company_id" value={formData.company_id} onChange={handleInputChange} className={inputClassName} inputMode="numeric" disabled={isLoading} /></Field>
                            <Field label="DIČ" name="vat_id"><input id="vat_id" name="vat_id" value={formData.vat_id} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                            <div className="hidden md:block" />
                            <Field label="Fakturační adresa" name="billing_address" icon={<MapPin className="h-4 w-4" />} className="md:col-span-2"><input id="billing_address" name="billing_address" value={formData.billing_address} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                            <Field label="Město" name="billing_city"><input id="billing_city" name="billing_city" value={formData.billing_city} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                            <Field label="PSČ" name="billing_postal_code"><input id="billing_postal_code" name="billing_postal_code" value={formData.billing_postal_code} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                            <Field label="Země" name="billing_country" className="md:col-span-2"><input id="billing_country" name="billing_country" value={formData.billing_country} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                        </div>
                    </Section>

                    <Section title="Dodací údaje" icon={<Truck className="h-5 w-5 text-amber-700" />} className="border-amber-100 bg-amber-50/70" action={
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" name="shipping_same_as_billing" checked={formData.shipping_same_as_billing} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" disabled={isLoading} /> Stejné jako fakturační</label>
                    }>
                        {formData.shipping_same_as_billing ? <div className="rounded-lg border border-amber-200 bg-white/70 px-4 py-3 text-sm text-slate-600">Do nové objednávky se použije fakturační adresa uvedená výše.</div> : (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Firma / provozovna" name="shipping_company"><input id="shipping_company" name="shipping_company" value={formData.shipping_company} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                                <Field label="Kontaktní osoba" name="shipping_contact_name"><input id="shipping_contact_name" name="shipping_contact_name" value={formData.shipping_contact_name} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                                <Field label="Dodací adresa" name="shipping_address" icon={<MapPin className="h-4 w-4" />} className="md:col-span-2"><input id="shipping_address" name="shipping_address" value={formData.shipping_address} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                                <Field label="Město" name="shipping_city"><input id="shipping_city" name="shipping_city" value={formData.shipping_city} onChange={handleInputChange} className={inputClassName} required disabled={isLoading} /></Field>
                                <Field label="PSČ" name="shipping_postal_code"><input id="shipping_postal_code" name="shipping_postal_code" value={formData.shipping_postal_code} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                                <Field label="Země" name="shipping_country" className="md:col-span-2"><input id="shipping_country" name="shipping_country" value={formData.shipping_country} onChange={handleInputChange} className={inputClassName} disabled={isLoading} /></Field>
                            </div>
                        )}
                        <Field label="Pokyny k doručení" name="delivery_instructions" icon={<FileText className="h-4 w-4" />} className="mt-4"><textarea id="delivery_instructions" name="delivery_instructions" value={formData.delivery_instructions} onChange={handleInputChange} className={`${inputClassName} min-h-24 resize-y`} placeholder="Např. zavolat před závozem nebo upřesnění vjezdu." disabled={isLoading} /></Field>
                    </Section>

                    <Section title="Nastavení katalogu" icon={<Eye className="h-5 w-5 text-slate-600" />} className="border-slate-200 bg-slate-50">
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                            <input type="checkbox" name="show_ordering_help" checked={formData.show_ordering_help} onChange={handleInputChange} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" disabled={isLoading} />
                            <span><span className="block font-medium text-slate-900">Zobrazovat nápovědu „Jak objednávat“</span><span className="mt-1 block text-sm text-slate-600">Nápovědu lze na katalogu dočasně zavřít nebo zde trvale vypnout.</span></span>
                        </label>
                    </Section>

                    {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                    {successMessage && <div className="flex items-center rounded-lg bg-green-50 p-4 text-sm text-green-700"><CheckCircle className="mr-2 h-5 w-5" />{successMessage}</div>}
                    <div className="sticky bottom-3 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                        <button type="submit" className={`flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors ${hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`} disabled={isLoading || !hasChanges}><Save className="h-5 w-5" />{isLoading ? 'Ukládám...' : 'Uložit změny'}</button>
                    </div>
                </form>

                <div className="my-8 border-t border-slate-200" />

                <form onSubmit={handlePasswordChange}>
                    <Section title="Změna hesla" icon={<LockKeyhole className="h-5 w-5 text-rose-700" />} className="border-rose-100 bg-rose-50/60">
                        <p className="mb-4 text-sm text-slate-600">Po úspěšné změně hesla vás z bezpečnostních důvodů odhlásíme ze všech zařízení.</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Současné heslo" name="current_password" className="md:col-span-2">
                                <input type="password" id="current_password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={inputClassName} autoComplete="current-password" required disabled={isChangingPassword} />
                            </Field>
                            <Field label="Nové heslo" name="new_password">
                                <input type="password" id="new_password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className={inputClassName} autoComplete="new-password" minLength={8} required disabled={isChangingPassword} />
                            </Field>
                            <Field label="Potvrzení nového hesla" name="confirm_password">
                                <input type="password" id="confirm_password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClassName} autoComplete="new-password" minLength={8} required disabled={isChangingPassword} />
                            </Field>
                        </div>

                        {passwordError && <div className="mt-4 rounded-lg bg-red-100 p-4 text-sm text-red-800">{passwordError}</div>}
                        {passwordSuccess && <div className="mt-4 flex items-center rounded-lg bg-green-100 p-4 text-sm text-green-800"><CheckCircle className="mr-2 h-5 w-5" />{passwordSuccess}</div>}

                        <div className="mt-5 flex justify-end">
                            <button type="submit" className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={isChangingPassword}>
                                <LockKeyhole className="h-5 w-5" />
                                {isChangingPassword ? 'Měním heslo...' : 'Změnit heslo'}
                            </button>
                        </div>
                    </Section>
                </form>
            </div>
        </CustomerPageShell>
    );
}

function Section({ title, icon, action, className, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; className: string; children: React.ReactNode }) {
    return <section className={`rounded-xl border p-5 ${className}`}><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">{icon}{title}</h2>{action}</div>{children}</section>;
}

function Field({ label, name, icon, className = '', children }: { label: string; name: string; icon?: React.ReactNode; className?: string; children: React.ReactNode }) {
    return <div className={className}><label htmlFor={name} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">{icon}{label}</label>{children}</div>;
}
