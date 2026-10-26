/** El gimnasio está en Madrid: todas las horas se muestran en hora de Madrid, estés donde estés. */
export const GYM_TZ = 'Europe/Madrid';

const dateKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: GYM_TZ });
const timeFmt = new Intl.DateTimeFormat('es-ES', { timeZone: GYM_TZ, hour: '2-digit', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'short' });
const longDayFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Día (YYYY-MM-DD) en Madrid de un instante ISO. */
export const dayKey = (iso: string | Date): string => dateKeyFmt.format(new Date(iso));

export const today = (now = new Date()): string => dayKey(now);

export const formatTime = (iso: string): string => timeFmt.format(new Date(iso));

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function nextDays(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

const asUtcNoon = (day: string) => new Date(`${day}T12:00:00Z`);

/** "lun", "mar"… sin punto final. */
export const weekdayShort = (day: string): string => weekdayFmt.format(asUtcNoon(day)).replace('.', '');

export const dayNumber = (day: string): number => Number(day.slice(8, 10));

/** "lunes, 26 de octubre", con "Hoy" y "Mañana" cuando toca. */
export function dayLabel(day: string, now = new Date()): string {
  const t = today(now);
  if (day === t) return 'Hoy';
  if (day === addDays(t, 1)) return 'Mañana';
  const text = longDayFmt.format(asUtcNoon(day));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Convierte lo que devuelve un <input type="datetime-local"> (hora de Madrid) a ISO con zona. */
export function madridLocalToIso(local: string): string {
  const [date, time] = local.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = (instant: number) => {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: GYM_TZ, timeZoneName: 'longOffset' })
      .formatToParts(new Date(instant))
      .find((p) => p.type === 'timeZoneName')?.value;
    const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const minutes = Number(match[2]) * 60 + Number(match[3]);
    return match[1] === '-' ? -minutes : minutes;
  };
  const result = guess - offset(guess - offset(guess) * 60_000) * 60_000;
  return new Date(result).toISOString();
}

/** Horas que faltan hasta un instante (negativo si ya pasó). */
export const hoursUntil = (iso: string, now = new Date()): number =>
  (Date.parse(iso) - now.getTime()) / 3_600_000;
