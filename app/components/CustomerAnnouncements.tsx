'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Info, Megaphone, X } from 'lucide-react';
import type { CustomerAnnouncement } from '@/types/announcements';

type Props = {
  onSelectTarget: (announcement: CustomerAnnouncement) => void;
};

const STORAGE_KEY = 'dismissed-customer-announcements-v1';

const styles = {
  info: {
    shell: 'border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-950',
    icon: 'bg-blue-600 text-white',
    action: 'text-blue-800 hover:bg-blue-100',
    Icon: Info,
  },
  warning: {
    shell: 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950',
    icon: 'bg-amber-500 text-white',
    action: 'text-amber-900 hover:bg-amber-100',
    Icon: AlertTriangle,
  },
  important: {
    shell: 'border-rose-300 bg-gradient-to-r from-rose-50 to-orange-50 text-rose-950',
    icon: 'bg-rose-600 text-white',
    action: 'text-rose-900 hover:bg-rose-100',
    Icon: Megaphone,
  },
};

function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export default function CustomerAnnouncements({ onSelectTarget }: Props) {
  const [announcements, setAnnouncements] = useState<CustomerAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, string>>({});

  useEffect(() => {
    setDismissed(readDismissed());
    let active = true;
    fetch('/api/announcements/active')
      .then((response) => response.ok ? response.json() : { announcements: [] })
      .then((data) => { if (active) setAnnouncements(data.announcements || []); })
      .catch((error) => console.error('Announcements load error:', error));
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => announcements.filter((announcement) => dismissed[announcement.id] !== announcement.updatedAt), [announcements, dismissed]);

  const dismiss = (announcement: CustomerAnnouncement) => {
    const next = { ...dismissed, [announcement.id]: announcement.updatedAt };
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  if (visible.length === 0) return null;

  return (
    <section className="mb-3 space-y-2" aria-label="Důležité informace">
      {visible.map((announcement) => {
        const appearance = styles[announcement.variant];
        const Icon = appearance.Icon;
        return (
          <article key={announcement.id} role={announcement.variant === 'important' ? 'alert' : 'status'} className={`relative overflow-hidden rounded-xl border p-4 shadow-sm ${appearance.shell}`}>
            <div className="flex items-start gap-3 pr-8">
              <span className={`mt-0.5 rounded-lg p-2 shadow-sm ${appearance.icon}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold leading-6">{announcement.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 opacity-90">{announcement.body}</p>
                {announcement.targetType && announcement.targetValue && announcement.targetLabel && (
                  <button type="button" onClick={() => onSelectTarget(announcement)} className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold transition-colors ${appearance.action}`}>
                    {announcement.targetType === 'category' ? `Zobrazit kategorii ${announcement.targetLabel}` : 'Zobrazit produkt'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {announcement.dismissible && <button type="button" onClick={() => dismiss(announcement)} className="absolute right-2 top-2 rounded-lg p-1.5 opacity-70 transition hover:bg-white/70 hover:opacity-100" aria-label="Zavřít oznámení" title="Zavřít oznámení"><X className="h-4 w-4" /></button>}
          </article>
        );
      })}
    </section>
  );
}
