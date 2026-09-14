'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Clock3, ExternalLink, Heart, History, Loader2, MonitorSmartphone, MousePointerClick, RefreshCw, ShoppingCart, Sparkles } from 'lucide-react';
import { withAdminAuth } from '@/components/auth/withAdminAuth';

type Period = '30d' | '90d' | 'year' | 'all';

type ConversionData = {
  period: Period;
  funnel: {
    journey_started: number;
    catalog_opened: number;
    first_item_added: number;
    cart_ready: number;
    order_summary_opened: number;
    summary_reached: number;
    order_submitted: number;
    tracked_customers: number;
    average_seconds_to_order: number | null;
    median_seconds_to_order: number | null;
    template_uses: number;
    history_uses: number;
    template_orders: number;
    history_orders: number;
    recommendation_views: number;
    recommendation_adds: number;
    recommendation_orders: number;
  };
  devices: Array<{ device_type: string; journeys: number; submitted: number }>;
  favorites: Array<{
    user_id: string;
    full_name: string | null;
    company: string | null;
    email: string | null;
    favorite_count: number;
    latest_favorite_at: string;
    products: Array<{
      product_id: string;
      name: string;
      category: string;
      added_at: string;
      in_stock: boolean;
      is_archived: boolean;
    }>;
  }>;
};

const percent = (value: number, base: number) => base > 0 ? Math.round((value / base) * 1000) / 10 : 0;

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours} h ${minutes} min`;
};

const deviceLabels: Record<string, string> = {
  mobile: 'Mobil',
  tablet: 'Tablet',
  desktop: 'Počítač',
  unknown: 'Neznámé',
};

function AdminConversionsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/conversions?period=${period}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Conversion analytics request failed');
        const json = await response.json();
        if (active) setData(json);
      } catch (error) {
        console.error('Error loading conversions:', error);
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [period, refreshKey]);

  const funnel = useMemo(() => {
    if (!data) return [];
    const rows = [
      { label: 'Zahájení objednávky', value: data.funnel.journey_started },
      { label: 'Košík s položkami', value: data.funnel.cart_ready },
      { label: 'Dosažení souhrnu', value: data.funnel.summary_reached },
      { label: 'Odeslaná objednávka', value: data.funnel.order_submitted },
    ];
    return rows.map((row, index) => ({
      ...row,
      fromStart: percent(row.value, rows[0].value),
      fromPrevious: index === 0 ? 100 : percent(row.value, rows[index - 1].value),
    }));
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Konverze objednávek</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Funnel pracuje pouze s pseudonymizovanými událostmi. Níže je oddělený provozní přehled aktuálních oblíbených položek zákazníků.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-medium text-slate-800"
          >
            <option value="30d">30 dní</option>
            <option value="90d">90 dní</option>
            <option value="year">1 rok</option>
            <option value="all">Vše</option>
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Obnovit
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-slate-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Načítání konverzí…
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">Konverzní přehled se nepodařilo načíst.</div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Activity} label="Sledovaní zákazníci" value={String(data.funnel.tracked_customers)} />
            <MetricCard icon={ShoppingCart} label="Dokončené objednávky" value={String(data.funnel.order_submitted)} />
            <MetricCard icon={Clock3} label="Medián aktivního objednání" value={formatDuration(data.funnel.median_seconds_to_order)} />
            <MetricCard icon={MousePointerClick} label="Celková konverze" value={`${percent(data.funnel.order_submitted, data.funnel.journey_started)} %`} />
          </div>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">Objednávkový funnel</h2>
            <p className="mt-1 text-sm text-slate-600">Každý krok počítá unikátní objednávkovou cestu. Košík zahrnuje i položky vložené ze šablony nebo historie.</p>
            <div className="mt-5 grid gap-3 lg:grid-cols-4">
              {funnel.map((row, index) => (
                <div key={row.label} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-600">{index + 1}. {row.label}</div>
                  <div className="mt-2 text-3xl font-bold text-slate-950">{row.value}</div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{row.fromPrevious} % z předchozího</span>
                    <span>{row.fromStart} % od začátku</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, row.fromStart)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Sparkles className="h-5 w-5 text-amber-500" /> Zrychlené objednávání</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ActionCard label="Použití šablony" uses={data.funnel.template_uses} orders={data.funnel.template_orders} />
                <ActionCard label="Objednání z historie" uses={data.funnel.history_uses} orders={data.funnel.history_orders} icon={History} />
                <ActionCard
                  label="Přidání z doporučení"
                  uses={data.funnel.recommendation_adds}
                  orders={data.funnel.recommendation_orders}
                  detail={`${data.funnel.recommendation_views} zobrazení doporučení`}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><MonitorSmartphone className="h-5 w-5 text-blue-600" /> Zařízení</h2>
              <div className="mt-5 space-y-3">
                {data.devices.length === 0 ? <p className="text-sm text-slate-500">Zatím nejsou dostupná data.</p> : data.devices.map((device) => (
                  <div key={device.device_type} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div><div className="font-semibold text-slate-900">{deviceLabels[device.device_type] || device.device_type}</div><div className="text-xs text-slate-500">{device.journeys} rozpracovaných objednávek</div></div>
                    <div className="text-right"><div className="font-bold text-slate-950">{device.submitted}</div><div className="text-xs text-slate-500">{percent(device.submitted, device.journeys)} % dokončeno</div></div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <Heart className="h-5 w-5 fill-rose-100 text-rose-600" /> Oblíbené položky zákazníků
                </h2>
                <p className="mt-1 text-sm text-slate-600">Aktuální stav oblíbených položek. Odebrané položky se zde již nezobrazují.</p>
              </div>
              <div className="text-sm font-semibold text-slate-600">
                {data.favorites.length} {data.favorites.length === 1 ? 'zákazník' : 'zákazníků'}
              </div>
            </div>

            {data.favorites.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Žádný zákazník zatím nemá uložené oblíbené položky.</div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {data.favorites.map((customer) => (
                  <FavoriteCustomerCard key={customer.user_id} customer={customer} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

type FavoriteCustomer = ConversionData['favorites'][number];

const formatFavoriteDate = (value: string) => new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
}).format(new Date(value));

function FavoriteCustomerCard({ customer }: { customer: FavoriteCustomer }) {
  const visibleProducts = customer.products.slice(0, 4);
  const remainingProducts = customer.products.slice(4);

  const renderProduct = (product: FavoriteCustomer['products'][number]) => (
    <div key={product.product_id} className="flex items-start justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <div className="font-medium text-slate-900">{product.name}</div>
        <div className="mt-0.5 text-xs text-slate-500">{product.category} · přidáno {formatFavoriteDate(product.added_at)}</div>
      </div>
      <div className="flex shrink-0 gap-1">
        {product.is_archived && <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">Archivováno</span>}
        {!product.is_archived && !product.in_stock && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">Není skladem</span>}
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <div className="font-bold text-slate-950">{customer.full_name || 'Zákazník bez jména'}</div>
          {customer.company && <div className="text-sm font-medium text-slate-700">{customer.company}</div>}
          {customer.email && <div className="truncate text-xs text-slate-500">{customer.email}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-rose-600">{customer.favorite_count}</div>
          <div className="text-xs text-slate-500">oblíbených</div>
        </div>
      </div>
      <div className="px-4 py-1">{visibleProducts.map(renderProduct)}</div>
      {remainingProducts.length > 0 && (
        <details className="border-t border-slate-200 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-blue-700">Zobrazit dalších {remainingProducts.length}</summary>
          <div className="mt-2">{remainingProducts.map(renderProduct)}</div>
        </details>
      )}
      <Link href={`/admin/users/${customer.user_id}`} className="flex items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
        Detail zákazníka <ExternalLink className="h-4 w-4" />
      </Link>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-blue-600" /><div className="mt-4 text-sm font-semibold text-slate-600">{label}</div><div className="mt-1 text-2xl font-bold text-slate-950">{value}</div></div>;
}

function ActionCard({ label, uses, orders, icon: Icon = Sparkles, detail }: { label: string; uses: number; orders: number; icon?: typeof Sparkles; detail?: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><Icon className="h-5 w-5 text-slate-500" /><div className="mt-3 font-semibold text-slate-900">{label}</div><div className="mt-2 text-2xl font-bold text-slate-950">{uses}</div><div className="text-xs text-slate-500">{detail ? `${detail} · ` : ''}{orders} dokončených objednávek</div></div>;
}

export default withAdminAuth(AdminConversionsPage);
