/**
 * El gimnasio está en Madrid: los horarios se piensan en hora de Madrid, pero en la base de datos
 * se guardan en UTC. Estas funciones convierten entre ambas teniendo en cuenta el horario de verano.
 */
export const GYM_TIME_ZONE = 'Europe/Madrid';

/** Diferencia en minutos entre la zona horaria y UTC en un instante dado (p. ej. +60 o +120). */
export function offsetMinutes(instant: Date, timeZone = GYM_TIME_ZONE): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

/** "2026-10-27" + "18:30" en hora de Madrid → Date en UTC. */
export function zonedToUtc(date: string, time = '00:00', timeZone = GYM_TIME_ZONE): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  let result = asUtc - offsetMinutes(new Date(asUtc), timeZone) * 60_000;
  // Segunda pasada por si justo cae en el cambio de hora.
  result = asUtc - offsetMinutes(new Date(result), timeZone) * 60_000;
  return new Date(result);
}

/** Fecha de hoy (YYYY-MM-DD) en Madrid. */
export function todayIn(now: Date, timeZone = GYM_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
