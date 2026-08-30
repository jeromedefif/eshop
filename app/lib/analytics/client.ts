'use client';

export const ANALYTICS_EVENTS = {
  catalogOpened: 'catalog_opened',
  firstItemAdded: 'first_item_added',
  orderSummaryOpened: 'order_summary_opened',
  orderSubmitted: 'order_submitted',
  templateUsed: 'template_used',
  historyOrderUsed: 'history_order_used',
  recommendationsShown: 'recommendations_shown',
  recommendationAdded: 'recommendation_added',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

type TrackOptions = {
  itemCount?: number;
  source?: 'catalog' | 'template' | 'history' | 'latest_order' | 'recommendation';
  oncePerJourney?: boolean;
};

const SESSION_KEY = 'beginy:analytics:session';
const JOURNEY_KEY = 'beginy:analytics:journey';
const EVENT_MARKER_PREFIX = 'beginy:analytics:event:';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const readOrCreateId = (storage: Storage, key: string) => {
  const current = storage.getItem(key);
  if (current) return current;
  const next = createId();
  storage.setItem(key, next);
  return next;
};

const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export const trackAnalyticsEvent = (
  eventName: AnalyticsEventName,
  { itemCount, source, oncePerJourney = false }: TrackOptions = {}
) => {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = readOrCreateId(window.sessionStorage, SESSION_KEY);
    const journeyId = readOrCreateId(window.localStorage, JOURNEY_KEY);
    const markerKey = `${EVENT_MARKER_PREFIX}${journeyId}:${eventName}`;

    if (oncePerJourney && window.sessionStorage.getItem(markerKey)) return;
    if (oncePerJourney) window.sessionStorage.setItem(markerKey, '1');

    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        eventName,
        sessionId,
        journeyId,
        deviceType: getDeviceType(),
        source,
        itemCount,
      }),
    }).catch(() => {
      // Analytika nesmí nikdy přerušit objednávkový proces.
    });
  } catch {
    // Blokované úložiště nebo analytika nesmí ovlivnit funkčnost portálu.
  }
};

export const completeAnalyticsJourney = () => {
  if (typeof window === 'undefined') return;
  try {
    const journeyId = window.localStorage.getItem(JOURNEY_KEY);
    if (journeyId) {
      const markerPrefix = `${EVENT_MARKER_PREFIX}${journeyId}:`;
      for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith(markerPrefix)) window.sessionStorage.removeItem(key);
      }
    }
    window.localStorage.removeItem(JOURNEY_KEY);
  } catch {
    // Analytika je doplňková a nesmí ovlivnit dokončení objednávky.
  }
};
