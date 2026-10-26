import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db.ts';
import { ensureDemoData } from '../src/seed.ts';
import { addDays, todayIn, zonedToUtc } from '../src/time.ts';

describe('horas de Madrid', () => {
  it('convierte teniendo en cuenta el horario de verano', () => {
    expect(zonedToUtc('2026-07-15', '18:00').toISOString()).toBe('2026-07-15T16:00:00.000Z'); // UTC+2
    expect(zonedToUtc('2026-12-15', '18:00').toISOString()).toBe('2026-12-15T17:00:00.000Z'); // UTC+1
  });

  it('calcula el día de hoy en Madrid aunque en UTC sea otro', () => {
    expect(todayIn(new Date('2026-10-26T23:30:00.000Z'))).toBe('2026-10-27');
  });

  it('suma días cruzando meses', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});

describe('datos de ejemplo', () => {
  it('rellena el horario sin duplicar si se llama dos veces', () => {
    const db = openDb(':memory:');
    const now = new Date('2026-10-26T08:00:00.000Z'); // lunes
    ensureDemoData(db, now, 7);
    const count = () => (db.prepare('SELECT COUNT(*) AS n FROM classes').get() as { n: number }).n;
    const first = count();
    // 5 días laborables × 6 + sábado 2 + domingo 1
    expect(first).toBe(33);
    ensureDemoData(db, now, 7);
    expect(count()).toBe(first);
  });
});
