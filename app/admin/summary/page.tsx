'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';

type Period = 'week' | 'month' | 'year' | 'all';

type SummaryResponse = {
  users_count: number;
  orders_count: number;
  total_liters: number;
  active_customers: number;
  average_liters: number;
  max_order_liters: number;
  top_customers: { user_id: string; full_name: string | null; company: string | null; email: string | null; liters: number }[];
  top_products: { name: string; liters: number }[];
  category_shares: { category: string; liters: number }[];
  package_shares: { pack: string; liters: number }[];
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

function AdminSummaryPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/summary?period=${period}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        if (!response.ok) throw new Error('Failed to load summary');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Error loading summary:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [period]);

  const totalCategoryLiters = useMemo(() => {
    if (!data) return 0;
    return data.category_shares.reduce((sum, row) => sum + row.liters, 0);
  }, [data]);

  const totalPackageLiters = useMemo(() => {
    if (!data) return 0;
    return data.package_shares.reduce((sum, row) => sum + row.liters, 0);
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Souhrny</h2>
          <p className="text-sm text-gray-600 mt-1">
            Zobrazeny objednávky za {periodDescription(period)}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="appearance-none px-3 py-2 pr-10 bg-white border border-gray-300 rounded-lg text-gray-800
                         hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="week">Týden</option>
              <option value="month">Měsíc</option>
              <option value="year">Rok</option>
              <option value="all">Vše</option>
            </select>
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Načítání souhrnů...</span>
        </div>
      ) : !data ? (
        <div className="bg-red-50 p-4 rounded-lg">
          Nepodařilo se načíst data.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <p className="text-sm text-indigo-700 font-medium">Registrovaní uživatelé</p>
              <p className="text-2xl font-bold text-indigo-900">{data.users_count}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700 font-medium">Celkový objem</p>
              <p className="text-2xl font-bold text-green-900">{data.total_liters} L</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">Celkový počet objednávek</p>
              <p className="text-2xl font-bold text-blue-900">{data.orders_count}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Aktivní zákazníci</p>
              <p className="text-xl font-semibold">{data.active_customers}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Průměr na objednávku</p>
              <p className="text-xl font-semibold">{data.average_liters} L</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Největší objednávka</p>
              <p className="text-xl font-semibold">{data.max_order_liters} L</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Top 5 zákazníků</p>
              <p className="text-xl font-semibold">{data.top_customers.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 zákazníků podle litrů</h3>
                {data.top_customers.length === 0 ? (
                  <div className="text-center py-6 text-gray-600">Žádná data.</div>
                ) : (
                  <div className="space-y-3">
                    {data.top_customers.map((row) => (
                      <div key={row.user_id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {row.full_name || row.company || row.email || row.user_id}
                          </div>
                          {row.company && (
                            <div className="text-xs text-gray-500">{row.company}</div>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{row.liters} L</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Podíl kategorií (litry)</h3>
                {data.category_shares.length === 0 ? (
                  <div className="text-center py-6 text-gray-600">Žádná data.</div>
                ) : (
                  <div className="space-y-2">
                    {data.category_shares.map((row) => {
                      const percent = totalCategoryLiters ? Math.round((row.liters / totalCategoryLiters) * 1000) / 10 : 0;
                      return (
                        <div key={row.category} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{row.category}</span>
                          <span className="text-sm text-gray-900">{percent}% ({row.liters} L)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Podíl obalů (litry)</h3>
                {data.package_shares.length === 0 ? (
                  <div className="text-center py-6 text-gray-600">Žádná data.</div>
                ) : (
                  <div className="space-y-2">
                    {data.package_shares.map((row) => {
                      const percent = totalPackageLiters ? Math.round((row.liters / totalPackageLiters) * 1000) / 10 : 0;
                      return (
                        <div key={row.pack} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{row.pack}</span>
                          <span className="text-sm text-gray-900">{percent}% ({row.liters} L)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nejprodávanější položky</h3>
                {data.top_products.length === 0 ? (
                  <div className="text-center py-6 text-gray-600">Žádná data.</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Položka</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Litry</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.top_products.map((row) => (
                          <tr key={row.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{row.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.liters} L</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default withAdminAuth(AdminSummaryPage);
