'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Loader2, Search } from 'lucide-react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';

type Period = 'week' | 'month' | 'year' | 'all';

type UserStatsRow = {
  user_id: string;
  full_name: string | null;
  company: string | null;
  email: string | null;
  total_orders: number;
  total_liters: number;
  top_product: { name: string; liters: number } | null;
};

const periodLabel = (period: Period) => {
  switch (period) {
    case 'week': return 'Týden';
    case 'month': return 'Měsíc';
    case 'year': return 'Rok';
    case 'all': return 'Vše';
    default: return 'Vše';
  }
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

function AdminStatsPage() {
  const [rows, setRows] = useState<UserStatsRow[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/stats?period=${period}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        if (!response.ok) throw new Error('Failed to load stats');
        const data = await response.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading stats:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [period]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      (row.full_name || '').toLowerCase().includes(q) ||
      (row.company || '').toLowerCase().includes(q) ||
      (row.email || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistiky</h2>
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

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vyhledat zákazníka..."
            className="block w-full pl-10 pr-4 py-2 border rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          />
        </div>
        {search && (
          <div className="mt-1 text-xs text-gray-600">
            Nalezeno {filtered.length} zákazníků
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Načítání statistik...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zákazník</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Litrů celkem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Počet objednávek</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nejprodávanější položka</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Žádná data pro zvolené období.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link href={`/admin/stats/${row.user_id}?period=${period}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {row.full_name || row.company || row.email || row.user_id}
                      </Link>
                      {row.company && (
                        <div className="text-xs text-gray-500">{row.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.total_liters} L</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.total_orders}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.top_product
                        ? `${row.top_product.name} (${row.top_product.liters} L)`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(AdminStatsPage);
