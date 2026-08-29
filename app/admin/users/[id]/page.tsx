'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Mail, Building, Phone, MapPin, FileText, Loader2, Trash2, AlertTriangle, Truck, Settings2, CreditCard, CircleCheck, Clock3, Send } from 'lucide-react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import type { UserProfile } from '@/types/auth';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'react-toastify';

const UserDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersLoaded, setOrdersLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
    const [confirmationResent, setConfirmationResent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserDetails = async () => {
            setIsLoading(true);
            setOrdersLoaded(false);
            setError(null);

            try {
                // 1. Načtení profilu uživatele (včetně posledního přihlášení) přes server API
                const profileResponse = await fetch(`/api/admin/users/${userId}`, {
                    cache: 'no-store',
                    headers: {
                        'Pragma': 'no-cache',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                });

                if (!profileResponse.ok) {
                    throw new Error(`Chyba při načítání profilu: ${profileResponse.status}`);
                }

                const profileData = await profileResponse.json();

                if (!profileData) {
                    throw new Error('Uživatel nebyl nalezen');
                }

                setProfile(profileData);

                // 2. Načtení objednávek tohoto uživatele přímo přes API s filtrováním na serveru
                try {
    const timestamp = Date.now();
    const ordersResponse = await fetch(`/api/orders?t=${timestamp}&userId=${userId}&period=all`, {
        cache: 'no-store',
        headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });

    if (!ordersResponse.ok) {
        throw new Error(`API error: ${ordersResponse.status}`);
    }

    const userOrders = await ordersResponse.json();

    if (Array.isArray(userOrders)) {
        setOrders(userOrders);
        setOrdersLoaded(true);
        console.log(`Načteno ${userOrders.length} objednávek pro uživatele ${userId}`);
    } else {
        console.warn('Neočekávaný formát dat z API:', userOrders);
        setOrders([]);
        setOrdersLoaded(false);
    }
} catch (apiError) {
    console.error('Chyba při načítání objednávek:', apiError);
    setOrders([]);
    setOrdersLoaded(false);
    // Zobrazíme varování, ale nezastavíme načítání profilu
    toast.warning('Nepodařilo se načíst objednávky uživatele');
}

            } catch (err) {
                console.error('Chyba při načítání dat uživatele:', err);
                setError(err instanceof Error ? err.message : 'Nepodařilo se načíst data uživatele');
                toast.error('Chyba při načítání dat uživatele');
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchUserDetails();
        }
    }, [userId]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return format(new Date(dateString), 'PPP', { locale: cs });
    };

    const formatLastSignIn = (dateString?: string | null) => {
        if (!dateString) return 'Nikdy';
        return format(new Date(dateString), 'PPP p', { locale: cs });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: format(date, 'dd.MM.yyyy', { locale: cs }),
            time: format(date, 'HH:mm', { locale: cs })
        };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Čeká na potvrzení';
            case 'confirmed': return 'Potvrzeno';
            case 'cancelled': return 'Zrušeno';
            default: return status;
        }
    };

    // Výpočet statistik z objednávek
    const calculateStats = () => {
        const totalCount = orders.length;
        const confirmedCount = orders.filter(order => order.status === 'confirmed').length;

        let totalVolume = 0;
        orders.forEach(order => {
            if (order.total_volume) {
                // Pokusíme se převést hodnotu na číslo bez ohledu na formát
                const value = parseFloat(String(order.total_volume).replace(/[^\d.-]/g, ''));
                if (!isNaN(value)) {
                    totalVolume += value;
                }
            }
        });

        return {
            totalCount,
            confirmedCount,
            totalVolume: Math.round(totalVolume * 10) / 10 // Zaokrouhlíme na 1 desetinné místo
        };
    };

    const stats = calculateStats();
    const canDeleteUser = ordersLoaded && orders.length === 0 && !profile?.is_admin;

    const getDeleteDisabledReason = () => {
        if (profile?.is_admin) return 'Administrátorský účet nelze smazat.';
        if (!ordersLoaded) return 'Mazání nelze ověřit, protože se nepodařilo načíst objednávky.';
        if (orders.length > 0) return 'Uživatele nelze smazat, protože již vytvořil objednávku.';
        return null;
    };

    const handleDeleteUser = async () => {
        if (!canDeleteUser || isDeletingUser) return;

        setIsDeletingUser(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.error || 'Nepodařilo se smazat uživatele.');
            }

            toast.success('Uživatel byl smazán.');
            router.push('/admin/users');
            router.refresh();
        } catch (deleteError) {
            console.error('Chyba při mazání uživatele:', deleteError);
            toast.error(deleteError instanceof Error ? deleteError.message : 'Nepodařilo se smazat uživatele.');
        } finally {
            setIsDeletingUser(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleResendConfirmation = async () => {
        if (!profile || profile.email_confirmed_at || isResendingConfirmation || confirmationResent) return;

        setIsResendingConfirmation(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/resend-confirmation`, {
                method: 'POST',
            });
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.error || 'Aktivační e-mail se nepodařilo odeslat.');
            }

            setConfirmationResent(true);
            toast.success('Aktivační e-mail byl znovu odeslán.');
        } catch (resendError) {
            console.error('Chyba při odesílání aktivačního e-mailu:', resendError);
            toast.error(resendError instanceof Error ? resendError.message : 'Aktivační e-mail se nepodařilo odeslat.');
        } finally {
            setIsResendingConfirmation(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 mr-2 animate-spin text-blue-600" />
                <span>Načítání informací o uživateli...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-600">{error}</p>
                    <Link
                        href="/admin/users"
                        className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na seznam uživatelů
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center mb-6">
                <Link
                    href="/admin/users"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na seznam uživatelů
                </Link>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Detail uživatele</h1>
                        <div className="flex flex-wrap justify-end gap-2">
                            <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-full ${
                                profile?.email_confirmed_at
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                            }`}>
                                {profile?.email_confirmed_at ? <CircleCheck className="mr-1 h-3.5 w-3.5" /> : <Clock3 className="mr-1 h-3.5 w-3.5" />}
                                {profile?.email_confirmed_at ? 'Aktivní účet' : 'Čeká na aktivaci'}
                            </span>
                            <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-full ${
                                profile?.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {profile?.is_admin ? 'Admin' : 'Uživatel'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                            <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
                                <User className="mr-2 h-5 w-5 text-blue-600" />
                                Kontakt a firma
                            </h2>
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="font-medium text-gray-600">Jméno</dt>
                                    <dd className="font-semibold text-gray-900">{profile?.full_name || 'Neuvedeno'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-600">Společnost</dt>
                                    <dd className="flex items-center font-semibold text-gray-900">
                                        <Building className="mr-1.5 h-4 w-4 text-gray-500" />
                                        {profile?.company || 'Neuvedeno'}
                                    </dd>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <dt className="font-medium text-gray-600">IČO</dt>
                                        <dd className="font-semibold text-gray-900">{profile?.company_id || 'Neuvedeno'}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-600">DIČ</dt>
                                        <dd className="font-semibold text-gray-900">{profile?.vat_id || 'Neuvedeno'}</dd>
                                    </div>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-600">E-mail</dt>
                                    <dd>
                                        <a href={`mailto:${profile?.email}`} className="inline-flex items-center font-semibold text-blue-700 hover:underline">
                                            <Mail className="mr-1.5 h-4 w-4" />
                                            {profile?.email || 'Neuvedeno'}
                                        </a>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-600">Telefon</dt>
                                    <dd>
                                        {profile?.phone ? (
                                            <a href={`tel:${profile.phone.replace(/\s+/g, '')}`} className="inline-flex items-center font-semibold text-blue-700 hover:underline">
                                                <Phone className="mr-1.5 h-4 w-4" />
                                                {profile.phone}
                                            </a>
                                        ) : (
                                            <span className="font-semibold text-gray-900">Neuvedeno</span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                            <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
                                <CreditCard className="mr-2 h-5 w-5 text-emerald-600" />
                                Fakturační adresa
                            </h2>
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="font-medium text-gray-600">Ulice a číslo</dt>
                                    <dd className="font-semibold text-gray-900">{profile?.billing_address || profile?.address || 'Neuvedeno'}</dd>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <dt className="font-medium text-gray-600">Město</dt>
                                        <dd className="font-semibold text-gray-900">{profile?.billing_city || profile?.city || 'Neuvedeno'}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-600">PSČ</dt>
                                        <dd className="font-semibold text-gray-900">{profile?.billing_postal_code || profile?.postal_code || 'Neuvedeno'}</dd>
                                    </div>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-600">Země</dt>
                                    <dd className="font-semibold text-gray-900">{profile?.billing_country || 'Česká republika'}</dd>
                                </div>
                            </dl>
                        </section>

                        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                            <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
                                <Truck className="mr-2 h-5 w-5 text-orange-600" />
                                Dodací adresa
                            </h2>
                            {profile?.shipping_same_as_billing ? (
                                <div className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                                    Stejná jako fakturační adresa
                                </div>
                            ) : (
                                <dl className="space-y-3 text-sm">
                                    <div>
                                        <dt className="font-medium text-gray-600">Firma / kontaktní osoba</dt>
                                        <dd className="font-semibold text-gray-900">
                                            {profile?.shipping_company || 'Neuvedeno'}
                                            {profile?.shipping_contact_name && <span className="block font-medium text-gray-700">{profile.shipping_contact_name}</span>}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-600">Ulice a číslo</dt>
                                        <dd className="font-semibold text-gray-900">{profile?.shipping_address || 'Neuvedeno'}</dd>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <dt className="font-medium text-gray-600">Město</dt>
                                            <dd className="font-semibold text-gray-900">{profile?.shipping_city || 'Neuvedeno'}</dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-gray-600">PSČ</dt>
                                            <dd className="font-semibold text-gray-900">{profile?.shipping_postal_code || 'Neuvedeno'}</dd>
                                        </div>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-gray-600">Země</dt>
                                        <dd className="font-semibold text-gray-900">{profile?.shipping_country || 'Česká republika'}</dd>
                                    </div>
                                </dl>
                            )}
                        </section>
                    </div>

                    {profile?.delivery_instructions && (
                        <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
                            <h2 className="mb-2 flex items-center font-semibold text-amber-950">
                                <MapPin className="mr-2 h-5 w-5" />
                                Instrukce k doručení
                            </h2>
                            <p className="whitespace-pre-wrap text-sm text-amber-950">{profile.delivery_instructions}</p>
                        </section>
                    )}

                    <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
                            <Settings2 className="mr-2 h-5 w-5 text-gray-600" />
                            Účet
                        </h2>
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <dt className="font-medium text-gray-600">Registrace</dt>
                                <dd className="mt-1 flex items-center font-semibold text-gray-900">
                                    <Calendar className="mr-1.5 h-4 w-4 text-gray-500" />
                                    {formatDate(profile?.created_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-600">Poslední přihlášení</dt>
                                <dd className="mt-1 flex items-center font-semibold text-gray-900">
                                    <Calendar className="mr-1.5 h-4 w-4 text-gray-500" />
                                    {formatLastSignIn(profile?.last_sign_in_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-600">Nápověda objednávání</dt>
                                <dd className="mt-1 font-semibold text-gray-900">
                                    {profile?.show_ordering_help ? 'Zobrazuje se' : 'Trvale skrytá'}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-gray-600">Aktivace účtu</dt>
                                <dd className="mt-1">
                                    {profile?.email_confirmed_at ? (
                                        <span className="inline-flex items-center font-semibold text-emerald-700">
                                            <CircleCheck className="mr-1.5 h-4 w-4" />
                                            E-mail potvrzen
                                        </span>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="inline-flex items-center font-semibold text-amber-800">
                                                <Clock3 className="mr-1.5 h-4 w-4" />
                                                Čeká na potvrzení
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleResendConfirmation}
                                                disabled={isResendingConfirmation || confirmationResent}
                                                className="flex items-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
                                            >
                                                {isResendingConfirmation ? (
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                ) : confirmationResent ? (
                                                    <CircleCheck className="mr-1.5 h-4 w-4" />
                                                ) : (
                                                    <Send className="mr-1.5 h-4 w-4" />
                                                )}
                                                {isResendingConfirmation
                                                    ? 'Odesílám...'
                                                    : confirmationResent
                                                        ? 'E-mail odeslán'
                                                        : 'Odeslat aktivaci znovu'}
                                            </button>
                                        </div>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </div>

            {/* Souhrnné statistiky objednávek */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-gray-500" />
                        Statistiky objednávek
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-indigo-700 font-medium">Celkem objednávek</p>
                            <p className="text-2xl font-bold text-indigo-900">{stats.totalCount}</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-green-700 font-medium">Dokončené objednávky</p>
                            <p className="text-2xl font-bold text-green-900">{stats.confirmedCount}</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-blue-700 font-medium">Celkový objem</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.totalVolume}L</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historie objednávek */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Historie objednávek</h2>

                    {orders.length === 0 ? (
                        <div className="text-center py-6 text-gray-700">
                            Uživatel zatím nemá žádné objednávky
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Datum</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Objem</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Stav</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Akce</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order) => {
                                        const dateTime = formatDateTime(order.created_at);

                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{dateTime.date}</div>
                                                    <div className="text-xs text-gray-700">{dateTime.time}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {order.total_volume}L
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                        {getStatusText(order.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        Detail
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-5">
                    <h2 className="text-lg font-semibold text-gray-900">Smazání uživatele</h2>
                    <p className="mt-1 text-sm text-gray-700">
                        {getDeleteDisabledReason() || 'Uživatel nemá žádné objednávky a jeho účet lze trvale smazat.'}
                    </p>
                    <button
                        type="button"
                        disabled={!canDeleteUser || isDeletingUser}
                        onClick={() => setShowDeleteConfirm(true)}
                        className={`mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                            canDeleteUser
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'cursor-not-allowed bg-gray-400'
                        }`}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Smazat uživatele
                    </button>
                </div>
            </div>

            {showDeleteConfirm && canDeleteUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-user-title"
                        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-red-100 p-2 text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 id="delete-user-title" className="text-lg font-semibold text-gray-900">
                                    Opravdu smazat uživatele?
                                </h2>
                                <p className="mt-2 text-sm text-gray-700">
                                    Trvale smažete účet <strong>{profile?.full_name || profile?.email}</strong>
                                    {profile?.email ? ` (${profile.email})` : ''}. Tuto akci nelze vrátit zpět.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={isDeletingUser}
                                onClick={() => setShowDeleteConfirm(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Zrušit
                            </button>
                            <button
                                type="button"
                                disabled={isDeletingUser}
                                onClick={handleDeleteUser}
                                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                            >
                                {isDeletingUser ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Smazat uživatele
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default withAdminAuth(UserDetailPage);
