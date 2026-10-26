import { type Db, transaction } from '../db.ts';
import { HttpError, notFound } from '../errors.ts';
import { type GymClass, getClass, toGymClass } from './classes.ts';

/** Hasta cuántas horas antes de que empiece se puede cancelar. */
export const CANCEL_LIMIT_HOURS = 2;

/**
 * Reserva una plaza aplicando las reglas del negocio, todo dentro de una transacción:
 * 1. La clase existe y no ha empezado.
 * 2. El usuario no la tiene ya reservada.
 * 3. Quedan plazas.
 * 4. No tiene otra reserva que se solape en horario.
 */
export function bookClass(db: Db, userId: number, classId: number, now: Date): GymClass {
  return transaction(db, () => {
    const gymClass = getClass(db, classId, userId);

    if (Date.parse(gymClass.startsAt) <= now.getTime()) {
      throw new HttpError(409, 'CLASS_STARTED', 'Esta clase ya ha empezado o ha terminado.');
    }
    if (gymClass.bookedByMe) {
      throw new HttpError(409, 'ALREADY_BOOKED', 'Ya tienes una plaza en esta clase.');
    }
    if (gymClass.spotsLeft === 0) {
      throw new HttpError(409, 'CLASS_FULL', 'La clase está completa.');
    }

    // Dos intervalos se solapan si cada uno empieza antes de que termine el otro.
    const overlap = db
      .prepare(
        `SELECT c.title FROM bookings b JOIN classes c ON c.id = b.class_id
         WHERE b.user_id = :userId
           AND c.starts_at < :endsAt
           AND strftime('%Y-%m-%dT%H:%M:%fZ', c.starts_at, '+' || c.duration_min || ' minutes') > :startsAt
         LIMIT 1`,
      )
      .get({ userId, startsAt: gymClass.startsAt, endsAt: gymClass.endsAt }) as { title: string } | undefined;
    if (overlap) {
      throw new HttpError(409, 'OVERLAP', `Coincide con otra clase que ya tienes: ${overlap.title}.`);
    }

    db.prepare('INSERT INTO bookings (user_id, class_id) VALUES (?, ?)').run(userId, classId);
    return getClass(db, classId, userId);
  });
}

export function cancelBooking(db: Db, userId: number, classId: number, now: Date): GymClass {
  return transaction(db, () => {
    const gymClass = getClass(db, classId, userId);
    if (!gymClass.bookedByMe) throw notFound('La reserva');

    const limit = Date.parse(gymClass.startsAt) - CANCEL_LIMIT_HOURS * 3_600_000;
    if (now.getTime() > limit) {
      throw new HttpError(
        409,
        'CANCEL_TOO_LATE',
        `Solo se puede cancelar hasta ${CANCEL_LIMIT_HOURS} horas antes de la clase.`,
      );
    }

    db.prepare('DELETE FROM bookings WHERE user_id = ? AND class_id = ?').run(userId, classId);
    return getClass(db, classId, userId);
  });
}

export function listMyBookings(db: Db, userId: number): GymClass[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.title, c.type, c.instructor, c.room, c.starts_at, c.duration_min, c.capacity,
              (SELECT COUNT(*) FROM bookings x WHERE x.class_id = c.id) AS booked,
              1 AS booked_by_me
       FROM bookings b JOIN classes c ON c.id = b.class_id
       WHERE b.user_id = ?
       ORDER BY c.starts_at`,
    )
    .all(userId);
  return (rows as unknown as Parameters<typeof toGymClass>[0][]).map(toGymClass);
}
