import type { Role } from '../auth.ts';
import type { Db } from '../db.ts';
import { HttpError, notFound } from '../errors.ts';
import { hashPassword, verifyPassword } from '../passwords.ts';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface UserRow extends PublicUser {
  password_hash: string;
}

export function createUser(
  db: Db,
  data: { name: string; email: string; password: string; role?: Role },
): PublicUser {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email);
  if (exists) throw new HttpError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese email.');

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email.toLowerCase(), hashPassword(data.password), data.role ?? 'member');
  return getUser(db, Number(result.lastInsertRowid));
}

export function getUser(db: Db, id: number): PublicUser {
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id);
  if (!user) throw notFound('El usuario');
  return { ...(user as unknown as PublicUser) };
}

/** Devuelve el usuario si email y contraseña coinciden. El mismo error para ambos casos, a propósito. */
export function authenticate(db: Db, email: string, password: string): PublicUser {
  const row = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.');
  }
  const { password_hash: _ignored, ...user } = row;
  return { ...user };
}
