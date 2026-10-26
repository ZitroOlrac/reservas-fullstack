import type { ClassType, GymClass } from '../api/types';
import { hoursUntil } from './dates';

export const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'yoga', label: 'Yoga' },
  { value: 'spinning', label: 'Spinning' },
  { value: 'crossfit', label: 'Crossfit' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'boxeo', label: 'Boxeo' },
];

export const typeLabel = (type: ClassType): string =>
  CLASS_TYPES.find((t) => t.value === type)?.label ?? type;

export const isClassType = (value: string | null): value is ClassType =>
  CLASS_TYPES.some((t) => t.value === value);

/** Debe coincidir con la regla del servidor (CANCEL_LIMIT_HOURS). */
export const CANCEL_LIMIT_HOURS = 2;

export type BookingAction =
  { kind: 'login' } | { kind: 'book' } | { kind: 'cancel' } | { kind: 'disabled'; reason: string };

/**
 * Qué botón mostrar en una clase. El servidor vuelve a validar todo;
 * esto solo evita ofrecer acciones que seguro van a fallar.
 */
export function bookingAction(c: GymClass, loggedIn: boolean, now = new Date()): BookingAction {
  const hours = hoursUntil(c.startsAt, now);
  if (hours <= 0) return { kind: 'disabled', reason: 'Finalizada' };
  if (c.bookedByMe) {
    return hours > CANCEL_LIMIT_HOURS ? { kind: 'cancel' } : { kind: 'disabled', reason: 'Reservada' };
  }
  if (c.spotsLeft === 0) return { kind: 'disabled', reason: 'Completa' };
  return loggedIn ? { kind: 'book' } : { kind: 'login' };
}
