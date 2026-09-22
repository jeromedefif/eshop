'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
type Issue = { id: string; order_id: string; status: string; attempts: number; last_error: string | null };
export default function EmailDeliveryIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/email-deliveries', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setIssues(await response.json()); setError(null);
    } catch { setError('Stav e-mailových oznámení se nepodařilo načíst.'); }
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(load, 60000); return () => clearInterval(timer); }, [load]);
  const retry = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/email-deliveries', { method: 'POST' });
      if (!response.ok) throw new Error();
      await load();
    } catch { setError('Opakování se nepodařilo spustit.'); }
    finally { setBusy(false); }
  };
  if (!issues.length && !error) return null;
  return <section className="mb-5 rounded-xl border-2 border-amber-400 bg-amber-50 p-4" aria-label="Neodeslaná oznámení">
    <h2 className="font-bold text-amber-950">E-mailová oznámení čekají na odeslání ({issues.length})</h2>
    <p className="mt-1 text-sm text-amber-900">Objednávky jsou uložené. U těchto oznámení zatím není potvrzené přijetí poskytovatelem e-mailu.</p>
    {error && <p role="alert">{error}</p>}
    <ul className="my-3 space-y-2">{issues.map((issue) => <li key={issue.id} className="text-sm text-amber-950">
      <Link className="font-semibold underline" href={`/admin/orders/${issue.order_id}`}>Objednávka {issue.order_id.slice(0, 8).toUpperCase()}</Link>
      {' — '}{issue.status === 'review' ? 'Vyžaduje ruční ověření u poskytovatele e-mailu' : issue.status === 'sending' ? 'Odesílá se' : issue.status === 'failed' ? 'Odeslání selhalo, další pokus je naplánovaný' : 'Čeká na odeslání'}
      {issue.last_error && <span className="block">{issue.last_error}</span>}
    </li>)}</ul>
    <button disabled={busy} onClick={retry} className="rounded-lg bg-amber-950 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Zpracovávám…' : 'Zpracovat čekající oznámení'}</button>
  </section>;
}
