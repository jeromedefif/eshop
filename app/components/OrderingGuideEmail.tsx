'use client';
import { useEffect, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
type Preview = { email: string; confirmed: boolean; sent_at: string | null; status: string | null; subject: string; html: string };
export default function OrderingGuideEmail({ userId }: { userId: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [confirmedRepeat, setConfirmedRepeat] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPreview(null); setError(''); setQueued(false); setConfirmedRepeat(false);
    fetch(`/api/admin/users/${userId}/ordering-guide`, { cache: 'no-store', signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Náhled nelze načíst.'); return data; })
      .then(setPreview).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [userId]);
  const send = async () => {
    if (busy || queued) return;
    setBusy(true); setError('');
    try {
      const r = await fetch(`/api/admin/users/${userId}/ordering-guide`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Návod se nepodařilo zařadit k odeslání.');
      setQueued(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Odeslání selhalo.'); }
    finally { setBusy(false); }
  };
  const pending = preview?.status && ['pending', 'sending', 'failed', 'review'].includes(preview.status);
  return <section className="my-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Mail aria-hidden="true" className="h-5 w-5 text-blue-700" />Návod k objednávání</h2>
    <p className="mt-1 text-sm text-slate-600">Pošlete zákazníkovi stručný postup první objednávky a kontakt na obchodního zástupce.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {!preview && !error && <p role="status" className="mt-3 text-sm">Načítám informace o odesílání…</p>}
    {preview && <>
      <p className="mt-3 text-sm">Poslední odeslání: <strong>{preview.sent_at ? new Date(preview.sent_at).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }) : 'Dosud neodesláno'}</strong></p>
      {!preview.confirmed ? <p className="mt-2 text-sm text-amber-800">Zákazník zatím nepotvrdil e-mail. Nejprve použijte „Odeslat aktivaci znovu“ výše.</p> : <details className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-blue-800">Poslat návod k objednávání</summary>
        <p className="mt-3 break-all text-sm">Příjemce: <strong>{preview.email}</strong></p>
        <p className="mt-1 text-sm">Předmět: <strong>{preview.subject}</strong></p>
        <iframe title="Náhled návodu k objednávání" sandbox="" srcDoc={preview.html} className="mt-3 h-[440px] w-full rounded-lg border border-slate-200" />
        {preview.sent_at && <label className="mt-3 flex items-start gap-2 text-sm text-amber-900"><input type="checkbox" className="mt-1" checked={confirmedRepeat} onChange={e => setConfirmedRepeat(e.target.checked)} />Zákazník už návod obdržel. Chci jej odeslat znovu.</label>}
        {pending && <p className="mt-3 text-sm text-amber-800">{preview.status === 'review' ? 'Před dalším odesláním je nutné ověřit předchozí pokus u poskytovatele e-mailů.' : 'Návod již čeká na odeslání nebo opakování pokusu.'}</p>}
        <button type="button" onClick={() => void send()} disabled={busy || queued || Boolean(pending) || Boolean(preview.sent_at && !confirmedRepeat)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
          {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{queued ? 'Zařazeno k odeslání' : busy ? 'Zařazuji…' : 'Odeslat návod'}
        </button>
        {queued && <p role="status" className="mt-2 text-sm text-emerald-800">Návod je ve frontě. Odeslání proběhne zpravidla do 5 minut.</p>}
      </details>}
    </>}
  </section>;
}
