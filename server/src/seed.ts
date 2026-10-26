import { randomBytes } from 'node:crypto';
import type { Db } from './db.ts';
import { type ClassType, createClass } from './services/classes.ts';
import { createUser } from './services/users.ts';
import { addDays, todayIn, zonedToUtc } from './time.ts';

/** Cuentas de prueba que aparecen en el README y en la pantalla de login. */
export const DEMO_ACCOUNTS = {
  admin: { name: 'Admin Pulso', email: 'admin@pulso.test', password: 'admin1234' },
  member: { name: 'Lucía Demo', email: 'demo@pulso.test', password: 'demo1234' },
};

type Slot = [
  time: string,
  type: ClassType,
  title: string,
  instructor: string,
  room: string,
  minutes: number,
  capacity: number,
];

const WEEKDAY: Slot[] = [
  ['07:30', 'spinning', 'Spinning Express', 'Diego Ramos', 'Sala Bici', 45, 16],
  ['09:00', 'yoga', 'Yoga Vinyasa', 'Sara Gil', 'Sala 1', 60, 14],
  ['13:30', 'crossfit', 'Crossfit WOD', 'Andrés Vega', 'Box', 50, 12],
  ['18:00', 'pilates', 'Pilates Core', 'Marta Ruiz', 'Sala 2', 55, 8],
  ['19:30', 'boxeo', 'Boxeo Técnico', 'Andrés Vega', 'Box', 60, 12],
  ['20:30', 'spinning', 'Spinning Power', 'Diego Ramos', 'Sala Bici', 45, 16],
];
const SATURDAY: Slot[] = [
  ['10:00', 'yoga', 'Yoga Restaurativo', 'Sara Gil', 'Sala 1', 75, 14],
  ['11:30', 'crossfit', 'Crossfit en equipo', 'Andrés Vega', 'Box', 60, 12],
];
const SUNDAY: Slot[] = [['10:30', 'pilates', 'Pilates Suave', 'Marta Ruiz', 'Sala 2', 60, 8]];

function slotsFor(date: string): Slot[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 6) return SATURDAY;
  if (weekday === 0) return SUNDAY;
  return WEEKDAY;
}

/** Pseudoaleatorio con semilla: los mismos datos en cada arranque, sin depender de Math.random. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/**
 * Crea las cuentas de prueba (si no existen) y rellena el horario de los próximos `days` días.
 * Se puede llamar varias veces: solo añade los días que aún no tienen clases.
 */
export function ensureDemoData(db: Db, now: Date, days = 14): void {
  const hasUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (hasUsers.n === 0) {
    createUser(db, { ...DEMO_ACCOUNTS.admin, role: 'admin' });
    createUser(db, DEMO_ACCOUNTS.member);
    [
      'Pablo',
      'Elena',
      'Javier',
      'Carmen',
      'Hugo',
      'Nerea',
      'Iván',
      'Alba',
      'Mario',
      'Laura',
      'Sergio',
      'Paula',
      'Álvaro',
      'Irene',
      'Raúl',
      'Claudia',
      'Óscar',
      'Noelia',
      'Adrián',
      'Sofía',
    ].forEach((name) =>
      createUser(db, {
        name,
        email: `${name
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()}@pulso.test`,
        password: randomBytes(12).toString('hex'),
      }),
    );
  }

  const memberIds = (
    db
      .prepare("SELECT id FROM users WHERE role = 'member' AND email <> ?")
      .all(DEMO_ACCOUNTS.member.email) as { id: number }[]
  ).map((u) => u.id);
  const countDay = db.prepare('SELECT COUNT(*) AS n FROM classes WHERE starts_at >= ? AND starts_at < ?');
  const book = db.prepare('INSERT OR IGNORE INTO bookings (user_id, class_id) VALUES (?, ?)');
  const today = todayIn(now);

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const from = zonedToUtc(date).toISOString();
    const to = zonedToUtc(addDays(date, 1)).toISOString();
    if ((countDay.get(from, to) as { n: number }).n > 0) continue;

    const random = seeded(Number(date.replaceAll('-', '')));
    for (const [time, type, title, instructor, room, durationMin, capacity] of slotsFor(date)) {
      const created = createClass(db, {
        title,
        type,
        instructor,
        room,
        startsAt: zonedToUtc(date, time).toISOString(),
        durationMin,
        capacity,
      });
      // Ocupación variada: algunas clases casi llenas, otras con sitio.
      const taken = Math.min(memberIds.length, Math.floor(random() * (capacity + 2)));
      memberIds.slice(0, taken).forEach((userId) => book.run(userId, created.id));
    }
  }
}
