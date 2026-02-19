// Úprava v souboru app/admin/users/page.tsx
// Přidání možnosti přejít na detail uživatele

'use client';

import { useState, useEffect } from 'react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import { Search, X, Mail, Building, Phone, Calendar, RefreshCw, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/auth';

const AdminUsersPage = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const router = useRouter();

    const fetchUsers = async () => {
        try {
            setIsRefreshing(true);
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin/users', {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Nepodařilo se načíst seznam uživatelů');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filtrování uživatelů podle vyhledávacího dotazu
    const filteredUsers = users.filter(user => {
        const searchTerms = searchQuery.toLowerCase().split(' ');

        return searchTerms.every(term =>
            (user.full_name?.toLowerCase().includes(term) || '') ||
            (user.email?.toLowerCase().includes(term) || '') ||
            (user.company?.toLowerCase().includes(term) || '') ||
            (user.phone?.toLowerCase().includes(term) || '')
        );
    });

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('cs-CZ');
    };

    const formatLastSignIn = (dateString?: string | null) => {
        if (!dateString) return 'Nikdy';

        const date = new Date(dateString);
        return date.toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleViewUserDetail = (userId: string) => {
        router.push(`/admin/users/${userId}`);
    };

    // Komponenta karty uživatele pro mobilní zobrazení
    const UserCard = ({ user }: { user: UserProfile }) => {
        return (
            <div
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleViewUserDetail(user.id)}
            >
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-col">
                            <div className="font-medium text-gray-900">{user.full_name || 'Neuvedeno'}</div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                <span>{user.email}</span>
                            </div>
                            {user.company && (
                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                    <Building className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    <span>{user.company}</span>
                                </div>
                            )}
                            {user.phone && (
                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                    <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    <span>{user.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                <span>{formatDate(user.created_at)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                <span>Poslední přihlášení: {formatLastSignIn(user.last_sign_in_at)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="ml-1 flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-full ${
                            user.is_admin
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {user.is_admin ? 'Admin' : 'Uživatel'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-6">
                    <p>{error}</p>
                    <button
                        onClick={fetchUsers}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Zkusit znovu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Správa uživatelů</h2>
                <button
                    onClick={fetchUsers}
                    className="flex items-center justify-center sm:justify-start px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                    disabled={loading || isRefreshing}
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="ml-2 hidden sm:inline">Obnovit</span>
                </button>
            </div>

            {/* Vyhledávací pole */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Vyhledat uživatele..."
                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="mt-2 text-sm text-gray-600">
                        Nalezeno {filteredUsers.length} uživatelů
                    </div>
                )}
            </div>

            {/* Mobilní zobrazení - karty */}
            <div className="md:hidden">
                {loading && users.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Načítání uživatelů...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <Search className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-base">
                            {searchQuery
                                ? 'Nenalezeni žádní uživatelé odpovídající vašemu hledání'
                                : 'Zatím nejsou žádní uživatelé'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                                Zobrazit všechny uživatele
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredUsers.map((user) => (
                            <UserCard key={user.id} user={user} />
                        ))}
                    </div>
                )}
            </div>

            {/* Tabulka uživatelů - desktop zobrazení */}
            <div className="hidden md:block">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {loading && users.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Načítání uživatelů...</span>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jméno / Společnost</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">R / P</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                            {searchQuery
                                                ? 'Nenalezeni žádní uživatelé odpovídající vašemu hledání'
                                                : 'Zatím nejsou žádní uživatelé'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleViewUserDetail(user.id)}
                                                    className="text-left"
                                                    title="Zobrazit detail uživatele"
                                                >
                                                    <div className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline">
                                                        {user.full_name || 'Neuvedeno'}
                                                        {user.is_admin && (
                                                            <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-800 align-middle">
                                                                ADMIN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-0.5">
                                                        {user.company || 'Neuvedeno'}
                                                    </div>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                                    <a
                                                        href={`mailto:${user.email}`}
                                                        className="text-sm text-blue-700 hover:text-blue-900 hover:underline"
                                                    >
                                                        {user.email}
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-900">{user.phone || 'Neuvedeno'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">R: {formatDate(user.created_at)}</div>
                                                <div className="text-sm text-gray-600 mt-0.5">P: {formatLastSignIn(user.last_sign_in_at)}</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default withAdminAuth(AdminUsersPage);
