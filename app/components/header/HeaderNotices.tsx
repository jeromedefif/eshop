'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_HEADER_NOTICES, parseHeaderNotices } from '@/lib/header-notices';
import HeaderNoticeCarousel from './HeaderNoticeCarousel';

export default function HeaderNotices() {
  const [messages, setMessages] = useState(DEFAULT_HEADER_NOTICES);
  useEffect(() => {
    let active = true;
    let fetching = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || fetching) return;
      fetching = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch('/api/header-notices', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Header notices unavailable');
        const data = await response.json();
        const next = parseHeaderNotices(data.messages);
        if (active) setMessages(next);
      } catch { /* Keep the last working messages; use the default on the first request. */ }
      finally { window.clearTimeout(timeout); fetching = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    window.addEventListener('header-notices-updated', visible);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); window.removeEventListener('header-notices-updated', visible); };
  }, []);
  return <HeaderNoticeCarousel messages={messages} />;
}
