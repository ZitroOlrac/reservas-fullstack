import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash de contraseñas con scrypt (incluido en Node, sin dependencias nativas).
 * Se guarda "sal:hash"; la sal aleatoria hace que dos contraseñas iguales tengan hashes distintos.
 */
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, KEY_LENGTH);
  // timingSafeEqual evita filtrar información por el tiempo que tarda la comparación.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
