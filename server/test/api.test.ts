import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { type Db, openDb } from '../src/db.ts';
import { createUser } from '../src/services/users.ts';

const SECRET = 'test-secret';
// "Ahora" fijo: lunes 26/10/2026 a las 10:00 UTC.
const NOW = new Date('2026-10-26T10:00:00.000Z');

let db: Db;
let app: ReturnType<typeof createApp>;

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.token;
}

function insertClass(
  overrides: Partial<{ startsAt: string; durationMin: number; capacity: number; title: string }> = {},
): number {
  const c = {
    title: 'Yoga',
    startsAt: '2026-10-27T09:00:00.000Z',
    durationMin: 60,
    capacity: 2,
    ...overrides,
  };
  const result = db
    .prepare(
      "INSERT INTO classes (title, type, instructor, room, starts_at, duration_min, capacity) VALUES (?, 'yoga', 'Sara', 'Sala 1', ?, ?, ?)",
    )
    .run(c.title, c.startsAt, c.durationMin, c.capacity);
  return Number(result.lastInsertRowid);
}

let admin: string;
let ana: string;
let bea: string;
let carl: string;

beforeEach(async () => {
  db = openDb(':memory:');
  app = createApp({ db, jwtSecret: SECRET, now: () => NOW });
  createUser(db, { name: 'Admin', email: 'admin@test.com', password: 'admin1234', role: 'admin' });
  createUser(db, { name: 'Ana', email: 'ana@test.com', password: 'password1' });
  createUser(db, { name: 'Bea', email: 'bea@test.com', password: 'password2' });
  createUser(db, { name: 'Carl', email: 'carl@test.com', password: 'password3' });
  admin = await login('admin@test.com', 'admin1234');
  ana = await login('ana@test.com', 'password1');
  bea = await login('bea@test.com', 'password2');
  carl = await login('carl@test.com', 'password3');
});

describe('autenticación', () => {
  it('registra un usuario y devuelve token sin exponer la contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nuevo', email: 'NUEVO@Test.com', password: '12345678' })
      .expect(201);
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      name: 'Nuevo',
      email: 'nuevo@test.com',
      role: 'member',
    });
    expect(res.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('valida los datos del registro', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'no-es-email', password: '123' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'name', 'password']);
  });

  it('no permite emails repetidos (sin importar mayúsculas)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana 2', email: 'ANA@test.com', password: '12345678' })
      .expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rechaza credenciales incorrectas con el mismo mensaje', async () => {
    const wrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: 'mala' })
      .expect(401);
    const noUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@test.com', password: 'mala' })
      .expect(401);
    expect(wrongPass.body).toEqual(noUser.body);
  });

  it('protege las rutas privadas y rechaza tokens falsos', async () => {
    await request(app).get('/api/me').expect(401);
    await request(app).get('/api/me').set('Authorization', 'Bearer inventado').expect(401);
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${ana}`).expect(200);
    expect(res.body.email).toBe('ana@test.com');
  });
});

describe('clases', () => {
  it('lista las clases de la semana con plazas libres', async () => {
    const id = insertClass();
    insertClass({ startsAt: '2026-11-20T09:00:00.000Z', title: 'Fuera de rango' });
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${ana}`).expect(201);

    const res = await request(app).get('/api/classes').set('Authorization', `Bearer ${ana}`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id,
      booked: 1,
      spotsLeft: 1,
      bookedByMe: true,
      endsAt: '2026-10-27T10:00:00.000Z',
    });

    const anon = await request(app).get('/api/classes').expect(200);
    expect(anon.body[0].bookedByMe).toBe(false);
  });

  it('filtra por tipo', async () => {
    insertClass();
    const res = await request(app).get('/api/classes?type=boxeo').expect(200);
    expect(res.body).toHaveLength(0);
  });

  it('solo un admin puede crear y borrar clases', async () => {
    const body = {
      title: 'Boxeo',
      type: 'boxeo',
      instructor: 'Andrés',
      room: 'Box',
      startsAt: '2026-10-28T18:00:00+01:00',
      durationMin: 60,
      capacity: 10,
    };
    await request(app).post('/api/classes').send(body).expect(401);
    await request(app).post('/api/classes').set('Authorization', `Bearer ${ana}`).send(body).expect(403);

    const created = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${admin}`)
      .send(body)
      .expect(201);
    expect(created.body.startsAt).toBe('2026-10-28T17:00:00.000Z'); // normalizada a UTC

    await request(app)
      .delete(`/api/classes/${created.body.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(204);
    await request(app).get(`/api/classes/${created.body.id}`).expect(404);
  });

  it('el admin ve la lista de asistentes', async () => {
    const id = insertClass();
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${bea}`).expect(201);
    const res = await request(app)
      .get(`/api/classes/${id}/attendees`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(res.body.map((a: { name: string }) => a.name)).toEqual(['Bea']);
  });
});

describe('reservas', () => {
  it('no deja reservar dos veces la misma clase', async () => {
    const id = insertClass();
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${ana}`).expect(201);
    const res = await request(app)
      .post(`/api/classes/${id}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(409);
    expect(res.body.error.code).toBe('ALREADY_BOOKED');
  });

  it('respeta el aforo', async () => {
    const id = insertClass({ capacity: 2 });
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${ana}`).expect(201);
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${bea}`).expect(201);
    const res = await request(app)
      .post(`/api/classes/${id}/booking`)
      .set('Authorization', `Bearer ${carl}`)
      .expect(409);
    expect(res.body.error.code).toBe('CLASS_FULL');
  });

  it('no deja reservar clases que ya empezaron', async () => {
    const id = insertClass({ startsAt: '2026-10-26T09:30:00.000Z' });
    const res = await request(app)
      .post(`/api/classes/${id}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(409);
    expect(res.body.error.code).toBe('CLASS_STARTED');
  });

  it('detecta clases que se solapan en horario', async () => {
    const first = insertClass({ startsAt: '2026-10-27T09:00:00.000Z', durationMin: 60 });
    const overlapping = insertClass({ startsAt: '2026-10-27T09:30:00.000Z', title: 'Pilates' });
    const justAfter = insertClass({ startsAt: '2026-10-27T10:00:00.000Z', title: 'Spinning' });

    await request(app)
      .post(`/api/classes/${first}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(201);
    const res = await request(app)
      .post(`/api/classes/${overlapping}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(409);
    expect(res.body.error.code).toBe('OVERLAP');
    // Una clase que empieza justo cuando termina la otra sí se puede reservar.
    await request(app)
      .post(`/api/classes/${justAfter}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(201);
  });

  it('permite cancelar con antelación y libera la plaza', async () => {
    const id = insertClass({ capacity: 1 });
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${ana}`).expect(201);
    const res = await request(app)
      .delete(`/api/classes/${id}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(200);
    expect(res.body).toMatchObject({ booked: 0, spotsLeft: 1, bookedByMe: false });
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${bea}`).expect(201);
  });

  it('no deja cancelar con menos de 2 horas de antelación', async () => {
    const id = insertClass({ startsAt: '2026-10-26T11:30:00.000Z' }); // empieza en 1 h 30 min
    db.prepare('INSERT INTO bookings (user_id, class_id) VALUES (2, ?)').run(id);
    const res = await request(app)
      .delete(`/api/classes/${id}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(409);
    expect(res.body.error.code).toBe('CANCEL_TOO_LATE');
  });

  it('lista las reservas del usuario ordenadas por fecha', async () => {
    const later = insertClass({ startsAt: '2026-10-29T09:00:00.000Z', title: 'Jueves' });
    const sooner = insertClass({ startsAt: '2026-10-27T18:00:00.000Z', title: 'Martes' });
    await request(app)
      .post(`/api/classes/${later}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(201);
    await request(app)
      .post(`/api/classes/${sooner}/booking`)
      .set('Authorization', `Bearer ${ana}`)
      .expect(201);
    const res = await request(app).get('/api/me/bookings').set('Authorization', `Bearer ${ana}`).expect(200);
    expect(res.body.map((c: { title: string }) => c.title)).toEqual(['Martes', 'Jueves']);
  });

  it('borrar una clase borra sus reservas (ON DELETE CASCADE)', async () => {
    const id = insertClass();
    await request(app).post(`/api/classes/${id}/booking`).set('Authorization', `Bearer ${ana}`).expect(201);
    await request(app).delete(`/api/classes/${id}`).set('Authorization', `Bearer ${admin}`).expect(204);
    const res = await request(app).get('/api/me/bookings').set('Authorization', `Bearer ${ana}`).expect(200);
    expect(res.body).toEqual([]);
  });
});

describe('errores', () => {
  it('responde 404 en JSON para rutas desconocidas y 400 con JSON mal formado', async () => {
    const notFound = await request(app).get('/api/nada').expect(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
    const badJson = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{mal')
      .expect(400);
    expect(badJson.body.error.code).toBe('BAD_JSON');
  });
});
