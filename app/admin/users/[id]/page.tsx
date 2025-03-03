'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, User, Calendar, Mail, Building, Phone, MapPin, FileText } from 'lucide-react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { UserProfile } from '@/types/auth';
import type { Order } from '@/types/orders';

const UserDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserDetails = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 1. Načtení profilu uživatele
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profileError) {
                    throw new Error(`Chyba při načítání profilu: ${profileError.message}`);
                }

                if (!profileData) {
                    throw new Error('Uživatel nebyl nalezen');
                }

                setProfile(profileData);

                // 2. Načtení Supabase uživatelských dat
                const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

                if (userError) {
                    console.error('Nepodařilo se načíst uživatelská data:', userError);
                    // Pokračujeme i bez těchto dat
                } else if (userData) {
                    setUser(userData.user);
                }

                // 3. Načtení objednávek uživatele
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            id,
                            product_id,
                            volume,
                            quantity,
                            product:products (
                                name,
                                category
                            )
                        )
                    `)
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (ordersError) {
                    console.error('Chyba při načítání objednávek:', ordersError);
                    // Pokračujeme i bez objednávek
                } else {
                    setOrders(ordersData || []);
                }
            } catch (err) {
                console.error('Chyba při načítání dat uživatele:', err);
                setError(err instanceof Error ? err.message : 'Nepodařilo se načíst data uživatele');
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

    const getTotalOrdersVolume = () => {
        return orders.reduce((sum, order) => sum + parseFloat(order.total_volume.toString()), 0);
    };

    const getConfirmedOrdersCount = () => {
        return orders.filter(order => order.status === 'confirmed').length;
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
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
                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2 text-gray-500" />
                                Osobní údaje
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-500">Jméno</span>
                                    <p className="font-medium">{profile?.full_name || 'Neuvedeno'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Email</span>
                                    <p className="font-medium flex items-center">
                                        <Mail className="w-4 h-4 mr-1 text-gray-400" />
                                        {profile?.email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Telefon</span>
                                    <p className="font-medium flex items-center">
                                        <Phone className="w-4 h-4 mr-1 text-gray-400" />
                                        {profile?.phone || 'Neuvedeno'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Společnost</span>
                                    <p className="font-medium flex items-center">
                                        <Building className="w-4 h-4 mr-1 text-gray-400" />
                                        {profile?.company || 'Neuvedeno'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Registrace</span>
                                    <p className="font-medium flex items-center">
                                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                        {formatDate(profile?.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Adresa a další údaje */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                                Fakturační údaje
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-500">Adresa</span>
                                    <p className="font-medium">{profile?.address || 'Neuvedeno'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Město</span>
                                    <p className="font-medium">{profile?.city || 'Neuvedeno'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">PSČ</span>
                                    <p className="font-medium">{profile?.postal_code || 'Neuvedeno'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Souhrnné statistiky objednávek */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-gray-500" />
                        Statistiky objednávek
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-indigo-700">Celkem objednávek</p>
                            <p className="text-2xl font-bold text-indigo-900">{orders.length}</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-green-700">Dokončené objednávky</p>
                            <p className="text-2xl font-bold text-green-900">{getConfirmedOrdersCount()}</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-blue-700">Celkový objem</p>
                            <p className="text-2xl font-bold text-blue-900">{getTotalOrdersVolume()}L</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historie objednávek */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Historie objednávek</h2>

                    {orders.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                            Uživatel zatím nemá žádné objednávky
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objem</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stav</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akce</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order) => {
                                        const dateTime = formatDateTime(order.created_at);

                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{dateTime.date}</div>
                                                    <div className="text-xs text-gray-500">{dateTime.time}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {order.total_volume}L
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                        {getStatusText(order.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="text-blue-600 hover:text-blue-900"
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
        </div>
    );
};

export default withAdminAuth(UserDetailPage);
