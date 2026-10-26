import { Router } from 'express';
import { currentUser, requireAdmin, requireAuth, requireUser, signToken } from './auth.ts';
import type { Db } from './db.ts';
import { classSchema, idParam, listQuerySchema, loginSchema, registerSchema } from './schemas.ts';
import { bookClass, cancelBooking, listMyBookings } from './services/bookings.ts';
import { createClass, deleteClass, getClass, listAttendees, listClasses } from './services/classes.ts';
import { authenticate, createUser, getUser } from './services/users.ts';
import { addDays, todayIn, zonedToUtc } from './time.ts';

interface Deps {
  db: Db;
  jwtSecret: string;
  now: () => Date;
}

export function apiRouter({ db, jwtSecret, now }: Deps): Router {
  const api = Router();

  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ---------- Autenticación ----------
  api.post('/auth/register', (req, res) => {
    const data = registerSchema.parse(req.body);
    const user = createUser(db, data);
    res.status(201).json({ token: signToken(user, jwtSecret), user });
  });

  api.post('/auth/login', (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = authenticate(db, email, password);
    res.json({ token: signToken(user, jwtSecret), user });
  });

  api.get('/me', requireAuth, (_req, res) => {
    res.json(getUser(db, requireUser(res).id));
  });

  api.get('/me/bookings', requireAuth, (_req, res) => {
    res.json(listMyBookings(db, requireUser(res).id));
  });

  // ---------- Clases ----------
  // Pública: cualquiera ve el horario; si hay sesión, también si está apuntado.
  api.get('/classes', (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const fromDate = query.from ?? todayIn(now());
    res.json(
      listClasses(db, {
        from: zonedToUtc(fromDate).toISOString(),
        to: zonedToUtc(addDays(fromDate, query.days)).toISOString(),
        type: query.type,
        userId: currentUser(res)?.id,
      }),
    );
  });

  api.get('/classes/:id', (req, res) => {
    res.json(getClass(db, idParam.parse(req.params.id), currentUser(res)?.id));
  });

  api.post('/classes', requireAdmin, (req, res) => {
    res.status(201).json(createClass(db, classSchema.parse(req.body)));
  });

  api.delete('/classes/:id', requireAdmin, (req, res) => {
    deleteClass(db, idParam.parse(req.params.id));
    res.status(204).end();
  });

  api.get('/classes/:id/attendees', requireAdmin, (req, res) => {
    res.json(listAttendees(db, idParam.parse(req.params.id)));
  });

  // ---------- Reservas ----------
  api.post('/classes/:id/booking', requireAuth, (req, res) => {
    const gymClass = bookClass(db, requireUser(res).id, idParam.parse(req.params.id), now());
    res.status(201).json(gymClass);
  });

  api.delete('/classes/:id/booking', requireAuth, (req, res) => {
    res.json(cancelBooking(db, requireUser(res).id, idParam.parse(req.params.id), now()));
  });

  return api;
}
