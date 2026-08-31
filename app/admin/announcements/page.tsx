'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Info, Loader2, Megaphone, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import type { AdminAnnouncement, AnnouncementTargetType, AnnouncementVariant } from '@/types/announcements';

type ProductOption = { id: string; name: string; category: string };
type FormState = {
  title: string;
  body: string;
  variant: AnnouncementVariant;
  startsAt: string;
  endsAt: string;
  targetType: AnnouncementTargetType;
  targetValue: string;
  dismissible: boolean;
  isActive: boolean;
};

const toLocalInput = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const emptyForm = (): FormState => ({
  title: '',
  body: '',
  variant: 'info',
  startsAt: toLocalInput(),
  endsAt: '',
  targetType: null,
  targetValue: '',
  dismissible: true,
  isActive: true,
});

const variantLabels: Record<AnnouncementVariant, string> = {
  info: 'Informace',
  warning: 'Upozornění',
  important: 'Důležité',
};

const variantStyles: Record<AnnouncementVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  important: 'border-rose-300 bg-rose-50 text-rose-950',
};

function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/announcements', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Oznámení se nepodařilo načíst.');
      setAnnouncements(data.announcements || []);
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Oznámení se nepodařilo načíst.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groupedProducts = useMemo(() => categories.map((category) => ({
    category,
    products: products.filter((product) => product.category === category),
  })).filter((group) => group.products.length > 0), [categories, products]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const edit = (announcement: AdminAnnouncement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      variant: announcement.variant,
      startsAt: toLocalInput(announcement.startsAt),
      endsAt: announcement.endsAt ? toLocalInput(announcement.endsAt) : '',
      targetType: announcement.targetType,
      targetValue: announcement.targetValue || '',
      dismissible: announcement.dismissible,
      isActive: announcement.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/admin/announcements/${editingId}` : '/api/admin/announcements', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Oznámení se nepodařilo uložit.');
      toast.success(editingId ? 'Oznámení bylo upraveno.' : 'Oznámení bylo vytvořeno.');
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Oznámení se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (announcement: AdminAnnouncement) => {
    const payload = {
      title: announcement.title,
      body: announcement.body,
      variant: announcement.variant,
      startsAt: announcement.startsAt,
      endsAt: announcement.endsAt,
      targetType: announcement.targetType,
      targetValue: announcement.targetValue,
      dismissible: announcement.dismissible,
      isActive: !announcement.isActive,
    };
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Stav se nepodařilo změnit.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Stav se nepodařilo změnit.');
    }
  };

  const remove = async (announcement: AdminAnnouncement) => {
    if (!window.confirm(`Opravdu smazat oznámení „${announcement.title}“?`)) return;
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Oznámení se nepodařilo smazat.');
      toast.success('Oznámení bylo smazáno.');
      if (editingId === announcement.id) resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Oznámení se nepodařilo smazat.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950"><Megaphone className="h-6 w-6 text-blue-600" /> Oznámení</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Časově řízené informace, které zákazníci uvidí nad katalogem.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Obnovit
        </button>
      </div>

      <form onSubmit={submit} className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{editingId ? 'Upravit oznámení' : 'Nové oznámení'}</h2>
            <p className="mt-1 text-sm text-slate-600">Bez aktivního časového okna se oznámení zákazníkům nezobrazí.</p>
          </div>
          {editingId && <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Zrušit úpravu"><X className="h-5 w-5" /></button>}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="lg:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Nadpis</span><input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="Např. Zářijový rozvoz burčáku" /></label>
          <label className="lg:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Text</span><textarea required maxLength={3000} rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="Objednávku vytvořte nejpozději v pondělí do 14:00…" /></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-800">Barevný typ</span><select value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value as AnnouncementVariant })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950">{Object.entries(variantLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-800">Odkaz</span><select value={form.targetType || ''} onChange={(e) => setForm({ ...form, targetType: (e.target.value || null) as AnnouncementTargetType, targetValue: '' })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950"><option value="">Bez odkazu</option><option value="category">Kategorie</option><option value="product">Konkrétní produkt</option></select></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-800">Začátek zobrazení</span><input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950" /></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-800">Konec zobrazení</span><input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950" /><span className="mt-1 block text-xs text-slate-500">Prázdné pole znamená bez koncového data.</span></label>

          {form.targetType === 'category' && <label className="lg:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Cílová kategorie</span><select required value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950"><option value="">Vyberte kategorii</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
          {form.targetType === 'product' && <label className="lg:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-800">Cílový produkt</span><select required value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950"><option value="">Vyberte produkt</option>{groupedProducts.map((group) => <optgroup key={group.category} label={group.category}>{group.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</optgroup>)}</select></label>}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"><input type="checkbox" checked={form.dismissible} onChange={(e) => setForm({ ...form, dismissible: e.target.checked })} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" /><span><strong className="block text-sm text-slate-900">Zákazník může zavřít</strong><span className="text-xs text-slate-500">Po zavření se stejná verze oznámení na tomto zařízení znovu nezobrazí.</span></span></label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" /><span><strong className="block text-sm text-slate-900">Aktivní</strong><span className="text-xs text-slate-500">Zobrazení stále respektuje nastavené datum začátku a konce.</span></span></label>
        </div>

        <div className={`mt-5 rounded-xl border p-4 ${variantStyles[form.variant]}`}><div className="text-xs font-bold uppercase tracking-wider opacity-70">Náhled</div><div className="mt-1 font-bold">{form.title || 'Nadpis oznámení'}</div><p className="mt-1 whitespace-pre-line text-sm leading-6">{form.body || 'Text oznámení se zobrazí zde.'}</p></div>
        <button disabled={saving} type="submit" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? 'Uložit změny' : 'Vytvořit oznámení'}</button>
      </form>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-950">Všechna oznámení</h2>
        {loading ? <div className="flex min-h-40 items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Načítání…</div> : announcements.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Zatím nebylo vytvořeno žádné oznámení.</div> : <div className="grid gap-4 xl:grid-cols-2">{announcements.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} onEdit={edit} onToggle={() => void toggleActive(announcement)} onRemove={() => void remove(announcement)} />)}</div>}
      </section>
    </div>
  );
}

function AnnouncementCard({ announcement, onEdit, onToggle, onRemove }: { announcement: AdminAnnouncement; onEdit: (announcement: AdminAnnouncement) => void; onToggle: () => void; onRemove: () => void }) {
  const now = Date.now();
  const isScheduled = new Date(announcement.startsAt).getTime() > now;
  const isExpired = announcement.endsAt ? new Date(announcement.endsAt).getTime() <= now : false;
  const stateLabel = !announcement.isActive ? 'Neaktivní' : isScheduled ? 'Naplánováno' : isExpired ? 'Ukončeno' : 'Právě zobrazeno';
  const Icon = announcement.variant === 'important' ? Megaphone : announcement.variant === 'warning' ? AlertTriangle : Info;
  return <article className={`rounded-2xl border p-5 ${variantStyles[announcement.variant]}`}><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="rounded-xl bg-white/70 p-2"><Icon className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{announcement.title}</h3><span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold">{stateLabel}</span></div><p className="mt-2 whitespace-pre-line text-sm leading-6">{announcement.body}</p></div></div></div><div className="mt-4 grid gap-2 text-xs opacity-75 sm:grid-cols-2"><span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Od {new Date(announcement.startsAt).toLocaleString('cs-CZ')}</span><span>{announcement.endsAt ? `Do ${new Date(announcement.endsAt).toLocaleString('cs-CZ')}` : 'Bez koncového data'}</span><span>{announcement.targetLabel ? `Odkaz: ${announcement.targetLabel}` : 'Bez odkazu'}</span><span>{announcement.dismissible ? 'Lze zavřít' : 'Nelze zavřít'}</span></div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => onEdit(announcement)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"><Pencil className="h-4 w-4" /> Upravit</button><button type="button" onClick={onToggle} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50">{announcement.isActive ? 'Deaktivovat' : 'Aktivovat'}</button><button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" /> Smazat</button></div></article>;
}

export default withAdminAuth(AdminAnnouncementsPage);
