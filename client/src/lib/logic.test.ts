import { describe, expect, it } from 'vitest';
import type { GymClass } from '../api/types';
import { bookingAction } from './classTypes';
import { addDays, dayKey, dayLabel, formatTime, madridLocalToIso, nextDays, weekdayShort } from './dates';

const NOW = new Date('2026-10-26T10:00:00.000Z'); // lunes, 11:00 en Madrid

const gymClass = (over: Partial<GymClass> = {}): GymClass => ({
  id: 1,
  title: 'Yoga',
  type: 'yoga',
  instructor: 'Sara',
  room: 'Sala 1',
  startsAt: '2026-10-26T17:00:00.000Z',
  endsAt: '2026-10-26T18:00:00.000Z',
  durationMin: 60,
  capacity: 10,
  booked: 3,
  spotsLeft: 7,
  bookedByMe: false,
  ...over,
});

describe('fechas en hora de Madrid', () => {
  it('formatea la hora y el día en Madrid', () => {
    expect(formatTime('2026-10-26T17:00:00.000Z')).toBe('18:00');
    expect(dayKey('2026-10-26T23:30:00.000Z')).toBe('2026-10-27');
  });

  it('genera la semana y nombra los días', () => {
    expect(nextDays('2026-10-30', 3)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(weekdayShort('2026-10-26')).toBe('lun');
    expect(dayLabel('2026-10-26', NOW)).toBe('Hoy');
    expect(dayLabel(addDays('2026-10-26', 1), NOW)).toBe('Mañana');
    expect(dayLabel('2026-10-29', NOW)).toBe('Jueves, 29 de octubre');
  });

  it('convierte la hora local de Madrid del formulario a ISO (con cambio de hora)', () => {
    expect(madridLocalToIso('2026-07-01T18:00')).toBe('2026-07-01T16:00:00.000Z');
    expect(madridLocalToIso('2026-12-01T18:00')).toBe('2026-12-01T17:00:00.000Z');
  });
});

describe('qué acción ofrecer en cada clase', () => {
  it('pide iniciar sesión si no hay usuario', () => {
    expect(bookingAction(gymClass(), false, NOW)).toEqual({ kind: 'login' });
  });

  it('permite reservar si hay plazas', () => {
    expect(bookingAction(gymClass(), true, NOW)).toEqual({ kind: 'book' });
  });

  it('marca completa si no quedan plazas', () => {
    expect(bookingAction(gymClass({ spotsLeft: 0, booked: 10 }), true, NOW)).toMatchObject({
      reason: 'Completa',
    });
  });

  it('permite cancelar con más de 2 h de antelación, pero no después', () => {
    expect(bookingAction(gymClass({ bookedByMe: true }), true, NOW)).toEqual({ kind: 'cancel' });
    const soon = gymClass({ bookedByMe: true, startsAt: '2026-10-26T11:30:00.000Z' });
    expect(bookingAction(soon, true, NOW)).toMatchObject({ kind: 'disabled', reason: 'Reservada' });
  });

  it('no ofrece nada en clases pasadas', () => {
    expect(bookingAction(gymClass({ startsAt: '2026-10-26T09:00:00.000Z' }), true, NOW)).toMatchObject({
      reason: 'Finalizada',
    });
  });
});
