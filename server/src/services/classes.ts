import type { Db } from '../db.ts';
import { notFound } from '../errors.ts';

export const CLASS_TYPES = ['yoga', 'spinning', 'crossfit', 'pilates', 'boxeo'] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

export interface GymClass {
  id: number;
  title: string;
  type: ClassType;
  instructor: string;
  room: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  capacity: number;
  booked: number;
  spotsLeft: number;
  /** Solo tiene sentido si hay usuario: ¿lo ha reservado él? */
  bookedByMe: boolean;
}

export interface NewClass {
  title: string;
  type: ClassType;
  instructor: string;
  room: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
}

interface ClassRow {
  id: number;
  title: string;
  type: ClassType;
  instructor: string;
  room: string;
  starts_at: string;
  duration_min: number;
  capacity: number;
  booked: number;
  booked_by_me: number;
}

/**
 * Consulta base: cada clase con cuántas reservas tiene y si el usuario actual está apuntado.
 * El LEFT JOIN + COUNT cuenta las reservas en la misma consulta (sin N+1).
 */
const SELECT_CLASSES = `
  SELECT c.id, c.title, c.type, c.instructor, c.room, c.starts_at, c.duration_min, c.capacity,
         COUNT(b.id) AS booked,
         COALESCE(MAX(b.user_id = :userId), 0) AS booked_by_me
  FROM classes c
  LEFT JOIN bookings b ON b.class_id = c.id
`;

export function toGymClass(row: ClassRow): GymClass {
  const ends = new Date(Date.parse(row.starts_at) + row.duration_min * 60_000);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    instructor: row.instructor,
    room: row.room,
    startsAt: row.starts_at,
    endsAt: ends.toISOString(),
    durationMin: row.duration_min,
    capacity: row.capacity,
    booked: row.booked,
    spotsLeft: Math.max(0, row.capacity - row.booked),
    bookedByMe: row.booked_by_me === 1,
  };
}

export function listClasses(
  db: Db,
  opts: { from: string; to: string; type?: ClassType; userId?: number },
): GymClass[] {
  const rows = db
    .prepare(
      `${SELECT_CLASSES}
       WHERE c.starts_at >= :from AND c.starts_at < :to
         AND (:type IS NULL OR c.type = :type)
       GROUP BY c.id
       ORDER BY c.starts_at, c.id`,
    )
    .all({ from: opts.from, to: opts.to, type: opts.type ?? null, userId: opts.userId ?? -1 });
  return (rows as unknown as ClassRow[]).map(toGymClass);
}

export function getClass(db: Db, id: number, userId?: number): GymClass {
  const row = db
    .prepare(`${SELECT_CLASSES} WHERE c.id = :id GROUP BY c.id`)
    .get({ id, userId: userId ?? -1 }) as ClassRow | undefined;
  if (!row) throw notFound('La clase');
  return toGymClass(row);
}

export function createClass(db: Db, data: NewClass): GymClass {
  const result = db
    .prepare(
      `INSERT INTO classes (title, type, instructor, room, starts_at, duration_min, capacity)
       VALUES (:title, :type, :instructor, :room, :startsAt, :durationMin, :capacity)`,
    )
    .run({ ...data });
  return getClass(db, Number(result.lastInsertRowid));
}

export function deleteClass(db: Db, id: number): void {
  const result = db.prepare('DELETE FROM classes WHERE id = ?').run(id);
  if (result.changes === 0) throw notFound('La clase');
}

export interface Attendee {
  id: number;
  name: string;
  email: string;
  bookedAt: string;
}

export function listAttendees(db: Db, classId: number): Attendee[] {
  getClass(db, classId); // 404 si no existe
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, b.created_at AS bookedAt
       FROM bookings b JOIN users u ON u.id = b.user_id
       WHERE b.class_id = ?
       ORDER BY b.created_at`,
    )
    .all(classId);
  return rows as unknown as Attendee[];
}
