'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';
import { activeHeaderNotices, HEADER_NOTICE_INTERVAL, type HeaderNotice } from '@/lib/header-notices';
import styles from './header.module.css';

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const reducedMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => false;

function NoticeText({ text }: { text: string }) {
  // Only **bold** is supported; every part remains escaped React text, never HTML.
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</>;
}

export default function HeaderNoticeCarousel({ messages }: { messages: HeaderNotice[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const reduceMotion = useSyncExternalStore(subscribeMotion, reducedMotion, serverMotion);
  const active = activeHeaderNotices(messages, now);
  const current = active.length ? index % active.length : 0;
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (active.length < 2 || paused || interacting || hidden || reduceMotion) return;
    const timer = window.setInterval(() => setIndex(value => value + 1), HEADER_NOTICE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [active.length, paused, interacting, hidden, reduceMotion]);
  if (!active.length) return null;
  return <div className={styles.noticeCarousel} role="region" aria-label="Informace pro zákazníky" aria-live="off"
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <div className={styles.noticeMessages}>
      {active.map((message, position) => <span key={`${position}-${message.text}`} className={`${styles.noticeMessage} ${position === current ? styles.noticeVisible : ''}`} aria-hidden={position !== current}><NoticeText text={message.text} /></span>)}
    </div>
    {active.length > 1 && <div className={styles.noticeControls}>
      {active.map((_, position) => <button key={position} type="button" className={styles.noticeDot} aria-label={`Zobrazit oznámení ${position + 1} z ${active.length}`} aria-pressed={position === current} onClick={() => setIndex(position)}><span /></button>)}
      {!reduceMotion && <button type="button" className={styles.noticePause} aria-label={paused ? 'Spustit střídání oznámení' : 'Pozastavit střídání oznámení'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}</button>}
    </div>}
  </div>;
}
