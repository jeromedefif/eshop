// app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import { supabase } from '@/lib/supabase/client';
import { Search, X, Mail, Building, Phone, Calendar } from 'lucide-react';
import type { UserProfile } from '@/types/auth';

const AdminUsersPage = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Nepodařilo se načíst seznam uživatelů');
        } finally {
            setLoading(false);
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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Správa uživatelů</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                        disabled={loading}
                    >
                        <span className={`${loading ? 'animate-spin' : ''}`}>⟳</span>
                        Obnovit
                    </button>
                </div>
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

            {/* Tabulka uživatelů */}
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jméno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Společnost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrace</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        {searchQuery
                                            ? 'Nenalezeni žádní uživatelé odpovídající vašemu hledání'
                                            : 'Zatím nejsou žádní uživatelé'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'Neuvedeno'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-900">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Building className="w-4 h-4 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-900">{user.company || 'Neuvedeno'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-900">{user.phone || 'Neuvedeno'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                user.is_admin
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {user.is_admin ? 'Admin' : 'Uživatel'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default withAdminAuth(AdminUsersPage);
