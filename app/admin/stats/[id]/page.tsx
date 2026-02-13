'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { withAdminAuth } from '@/components/auth/withAdminAuth';

type Period = 'week' | 'month' | 'year' | 'all';

type StatsResponse = {
  profile: {
    id: string;
    full_name: string | null;
    company: string | null;
    email: string | null;
    created_at: string;
  };
  stats: {
    total_orders: number;
    total_liters: number;
    average_liters: number;
    last_order_at: string | null;
  };
  products: { name: string; liters: number }[];
};

const periodDescription = (period: Period) => {
  switch (period) {
    case 'week': return 'posledních 7 dnů';
    case 'month': return 'posledních 30 dnů';
    case 'year': return 'poslední rok';
    case 'all': return 'všechny objednávky';
    default: return 'všechny objednávky';
  }
};

function AdminStatsDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  const period = (searchParams.get('period') || 'all') as Period;

  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/stats/${userId}?period=${period}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        if (!response.ok) throw new Error('Failed to load stats');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Error loading user stats:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      load();
    }
  }, [userId, period]);

  const lastOrderText = useMemo(() => {
    if (!data?.stats.last_order_at) return '—';
    return format(new Date(data.stats.last_order_at), 'dd.MM.yyyy', { locale: cs });
  }, [data?.stats.last_order_at]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <Link
          href={`/admin/stats?period=${period}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na statistiky
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Načítání statistik...</span>
        </div>
      ) : !data ? (
        <div className="bg-red-50 p-4 rounded-lg">
          Nepodařilo se načíst data.
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Statistiky zákazníka</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Zobrazeny objednávky za {periodDescription(period)}
                  </p>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Poslední objednávka: {lastOrderText}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-lg font-semibold text-gray-900">
                  {data.profile.full_name || data.profile.company || data.profile.email}
                </div>
                {data.profile.company && (
                  <div className="text-sm text-gray-600">{data.profile.company}</div>
                )}
                {data.profile.email && (
                  <div className="text-sm text-gray-600">{data.profile.email}</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Souhrn</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-indigo-700 font-medium">Celkem objednávek</p>
                  <p className="text-2xl font-bold text-indigo-900">{data.stats.total_orders}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">Celkem litrů</p>
                  <p className="text-2xl font-bold text-green-900">{data.stats.total_liters} L</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-700 font-medium">Průměr na objednávku</p>
                  <p className="text-2xl font-bold text-blue-900">{data.stats.average_liters} L</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nejprodávanější položky</h2>

              {data.products.length === 0 ? (
                <div className="text-center py-6 text-gray-700">
                  Zatím nejsou žádné položky v měřených kategoriích.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Položka</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Celkem litrů</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.products.map((row) => (
                        <tr key={row.name} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{row.liters} L</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default withAdminAuth(AdminStatsDetailPage);
