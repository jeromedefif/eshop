'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function AuthDebugPage() {
  const { user, profile, isAdmin, isLoading } = useAuth();
  const [localData, setLocalData] = useState<any>(null);

  useEffect(() => {
    // Pokus o zjištění lokálního stavu autentizace
    try {
      const localStorageKeys = Object.keys(localStorage);
      const authKeys = localStorageKeys.filter(key =>
        key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')
      );

      const authData: Record<string, any> = {};
      for (const key of authKeys) {
        try {
          authData[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          authData[key] = localStorage.getItem(key);
        }
      }

      setLocalData(authData);
    } catch (error) {
      console.error('Error checking local storage:', error);
    }
  }, []);

  if (isLoading) {
    return <div className="p-6">Načítání autentizačních dat...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Diagnostika Autentizace</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Stav Autentizace</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Přihlášen:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
              user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user ? 'ANO' : 'NE'}
            </span>
          </div>

          <div>
            <span className="font-medium">Admin:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
              isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isAdmin ? 'ANO' : 'NE'}
            </span>
          </div>
        </div>

        {user && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Informace o uživateli:</h3>
            <p><span className="font-medium">ID:</span> {user.id}</p>
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">Ověřeno:</span> {user.confirmed_at ? 'Ano' : 'Ne'}</p>
          </div>
        )}

        {profile && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Profil:</h3>
            <p><span className="font-medium">Jméno:</span> {profile.full_name}</p>
            <p><span className="font-medium">Společnost:</span> {profile.company}</p>
            <p><span className="font-medium">Admin:</span> {profile.is_admin ? 'Ano' : 'Ne'}</p>
          </div>
        )}
      </div>

      {/* Lokální úložiště */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Lokální úložiště (autentizační data)</h2>

        {localData ? (
          <div className="bg-gray-50 p-3 rounded">
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(localData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">Žádná autentizační data v localStorage</p>
        )}
      </div>
    </div>
  );
}
