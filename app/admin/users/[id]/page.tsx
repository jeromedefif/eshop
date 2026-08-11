'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Mail, Building, Phone, MapPin, FileText, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'react-toastify';

const UserDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [profile, setProfile] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersLoaded, setOrdersLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
        <div className="max-w-4xl mx-auto p-6">
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
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Detail uživatele</h1>
                        <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-full ${
                            profile?.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                            {profile?.is_admin ? 'Admin' : 'Uživatel'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Základní informace */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2 text-gray-500" />
                                Osobní údaje
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Jméno:</span>
                                    <p className="font-medium text-gray-900">{profile?.full_name || 'Neuvedeno'}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Email:</span>
                                    <p className="font-medium text-gray-900 flex items-center">
                                        <Mail className="w-4 h-4 mr-1 text-gray-500" />
                                        {profile?.email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Telefon:</span>
                                    <p className="font-medium text-gray-900 flex items-center">
                                        <Phone className="w-4 h-4 mr-1 text-gray-500" />
                                        {profile?.phone || 'Neuvedeno'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Společnost:</span>
                                    <p className="font-medium text-gray-900 flex items-center">
                                        <Building className="w-4 h-4 mr-1 text-gray-500" />
                                        {profile?.company || 'Neuvedeno'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Registrace:</span>
                                    <p className="font-medium text-gray-900 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                                        {formatDate(profile?.created_at)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Poslední přihlášení:</span>
                                    <p className="font-medium text-gray-900 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                                        {formatLastSignIn(profile?.last_sign_in_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Adresa a další údaje */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                                Fakturační údaje
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Adresa:</span>
                                    <p className="font-medium text-gray-900">{profile?.address || 'Neuvedeno'}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Město:</span>
                                    <p className="font-medium text-gray-900">{profile?.city || 'Neuvedeno'}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">PSČ:</span>
                                    <p className="font-medium text-gray-900">{profile?.postal_code || 'Neuvedeno'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
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
