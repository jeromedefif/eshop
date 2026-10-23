export const HEADER_NOTICE_INTERVAL = 10_000;
export const HEADER_NOTICE_LIMIT = 3;
export const HEADER_NOTICE_MAX_LENGTH = 180;

export interface HeaderNotice {
  text: string;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
}
export interface HeaderNoticeSettings {
  messages: HeaderNotice[];
  revision: string;
}
export const DEFAULT_HEADER_NOTICES: HeaderNotice[] = [{
  text: 'Objednávky pro rozvozy nejpozději: **v úterý do 13:00**',
  enabled: true, startsAt: null, endsAt: null,
}];

export function parseHeaderNotices(value: unknown): HeaderNotice[] {
  if (!Array.isArray(value) || value.length > HEADER_NOTICE_LIMIT) throw new Error('Lze uložit nejvýše 3 oznámení.');
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Neplatné oznámení.');
    const message = item as Record<string, unknown>;
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (!text || text.length > HEADER_NOTICE_MAX_LENGTH) throw new Error(`Text musí mít 1 až ${HEADER_NOTICE_MAX_LENGTH} znaků.`);
    if (typeof message.enabled !== 'boolean') throw new Error('Neplatný stav oznámení.');
    const parseDate = (date: unknown) => {
      if (date === null || date === '') return null;
      if (typeof date !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error('Neplatné datum platnosti.');
      return new Date(date).toISOString();
    };
    const startsAt = parseDate(message.startsAt);
    const endsAt = parseDate(message.endsAt);
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('Konec platnosti musí být po začátku.');
    return { text, enabled: message.enabled, startsAt, endsAt };
  });
}

export function activeHeaderNotices(messages: HeaderNotice[], now = Date.now()) {
  return messages.filter(message => message.enabled
    && (!message.startsAt || Date.parse(message.startsAt) <= now)
    && (!message.endsAt || Date.parse(message.endsAt) > now));
}
