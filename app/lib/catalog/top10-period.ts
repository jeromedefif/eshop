const zone = 'Europe/Prague';
export function pragueDayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftDay(day: string, days: number): string {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function pragueMidnight(day: string): Date {
  const target = Date.parse(`${day}T00:00:00Z`);
  let instant = target;
  const format = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 3; i++) {
    const parts = format.formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
    const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    instant += target - local;
  }
  return new Date(instant);
}
export function top10Period(now = new Date()) {
  const day = pragueDayKey(now);
  return { day, start: pragueMidnight(shiftDay(day, -90)), end: pragueMidnight(day), nextRefresh: pragueMidnight(shiftDay(day, 1)) };
}
