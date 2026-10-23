'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { activeHeaderNotices, DEFAULT_HEADER_NOTICES, HEADER_NOTICE_MAX_LENGTH, HEADER_NOTICE_LIMIT, type HeaderNotice, type HeaderNoticeSettings } from '@/lib/header-notices';
import HeaderNoticeCarousel from './HeaderNoticeCarousel';

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-200';
function localDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function isoDate(value: string) { return value ? new Date(value).toISOString() : null; }

export default function HeaderNoticeEditor() {
  const [messages, setMessages] = useState<HeaderNotice[]>(DEFAULT_HEADER_NOTICES);
  const [stored, setStored] = useState('');
  const [revision, setRevision] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dirty = Boolean(revision) && JSON.stringify(messages) !== stored;
  const load = useCallback(async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/header-notices', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nastavení se nepodařilo načíst.');
      setMessages(data.messages); setRevision(data.revision); setStored(JSON.stringify(data.messages)); setLocalOnly(data.localOnly === true);
    } catch (error) { setError(error instanceof Error ? error.message : 'Nastavení se nepodařilo načíst.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const update = (index: number, patch: Partial<HeaderNotice>) => {
    setMessages(current => current.map((message, position) => position === index ? { ...message, ...patch } : message));
    setSuccess('');
  };
  const move = (index: number, offset: number) => {
    setMessages(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
    setSuccess('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !revision) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/header-notices', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nastavení se nepodařilo uložit.');
      const settings = data as HeaderNoticeSettings;
      setMessages(settings.messages); setRevision(settings.revision); setStored(JSON.stringify(settings.messages));
      setSuccess(localOnly ? 'Uloženo pouze v místním náhledu.' : 'Uloženo. Změna se zákazníkům projeví nejpozději do jedné minuty.');
      window.dispatchEvent(new Event('header-notices-updated'));
    } catch (error) { setError(error instanceof Error ? error.message : 'Nastavení se nepodařilo uložit.'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="header-notice-editor" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 id="header-notice-editor" className="text-lg font-bold text-slate-950">Proužek nad hlavičkou</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Až tři krátké zprávy pro přihlášené zákazníky i návštěvníky veřejného katalogu. Aktivní zprávy se střídají po 10 sekundách v pořadí níže. Jedna zpráva zůstává zobrazená trvale.</p>
    {localOnly && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">Místní náhled: nastavení se ukládá jen do souboru v tomto projektu. Produkční proužek ani databázi neovlivní.</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-slate-600"><Loader2 size={18} className="animate-spin" />Načítáme nastavení…</p> : <form onSubmit={submit}>
      <fieldset disabled={saving || !revision} className="mt-5 space-y-4 disabled:opacity-60">
        <legend className="sr-only">Zprávy v horním proužku</legend>
        {messages.map((message, index) => <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Oznámení {index + 1}</h3>
            <div className="flex items-center gap-1">
              <label className="mr-3 flex min-h-11 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={message.enabled} onChange={event => update(index, { enabled: event.target.checked })} />Zapnuto</label>
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Posunout oznámení ${index + 1} výše`} className="rounded-lg p-3 hover:bg-white disabled:opacity-30"><ArrowUp size={17} /></button>
              <button type="button" disabled={index === messages.length - 1} onClick={() => move(index, 1)} aria-label={`Posunout oznámení ${index + 1} níže`} className="rounded-lg p-3 hover:bg-white disabled:opacity-30"><ArrowDown size={17} /></button>
              <button type="button" onClick={() => { setMessages(current => current.filter((_, position) => position !== index)); setSuccess(''); }} aria-label={`Odstranit oznámení ${index + 1}`} className="rounded-lg p-3 text-red-700 hover:bg-red-50"><Trash2 size={17} /></button>
            </div>
          </div>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-800">Text oznámení</span><textarea required maxLength={HEADER_NOTICE_MAX_LENGTH} rows={2} value={message.text} onChange={event => update(index, { text: event.target.value })} className={`${inputClass} py-2`} placeholder="Např. Změna termínu rozvozu během svátků" /><span className="mt-1 block text-xs text-slate-500">{message.text.length}/{HEADER_NOTICE_MAX_LENGTH} znaků. Zvýraznění: **důležitý text**. HTML se nepoužívá.</span></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Platnost od (nepovinné)</span><input type="datetime-local" value={localDate(message.startsAt)} onChange={event => update(index, { startsAt: isoDate(event.target.value) })} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Platnost do (nepovinné)</span><input type="datetime-local" value={localDate(message.endsAt)} onChange={event => update(index, { endsAt: isoDate(event.target.value) })} className={inputClass} /></label>
          </div>
        </div>)}
        <p className="text-xs leading-5 text-slate-500">Čas odpovídá časovému pásmu vašeho zařízení. Prázdná data znamenají neomezenou platnost. Pokud žádná zpráva není aktivní, prostor pro zprávy se skryje; kontakt zůstane na počítači viditelný.</p>
        {messages.length < HEADER_NOTICE_LIMIT && <button type="button" onClick={() => { setMessages(current => [...current, { text: '', enabled: true, startsAt: null, endsAt: null }]); setSuccess(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Plus size={17} />Přidat oznámení</button>}
      </fieldset>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Náhled aktuálně platných zpráv</h3>
        <div className="rounded-xl bg-[#172e4e] px-4 text-[11px] text-white"><HeaderNoticeCarousel messages={messages} /></div>
        {!activeHeaderNotices(messages).length && <p className="mt-2 text-sm text-slate-500">Aktuálně nebude zobrazená žádná zpráva.</p>}
        {messages.filter(message => message.enabled).length > 1 && <p className="mt-2 text-xs text-slate-500">Zprávu můžete přepnout tečkami. Při najetí myší nebo ovládání klávesnicí se střídání pozastaví.</p>}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={saving || !revision || !dirty} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}Uložit proužek</button>
        <button type="button" disabled={saving} onClick={() => { if (!dirty || window.confirm('Zahodit neuložené změny a načíst uložené nastavení?')) void load(); }} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Načíst uložené</button>
      </div>
    </form>}
  </section>;
}
