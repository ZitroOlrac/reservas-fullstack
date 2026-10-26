import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './errors.ts';

export type Role = 'member' | 'admin';
export interface AuthUser {
  id: number;
  role: Role;
}

const TOKEN_TTL = '7d';

export function signToken(user: AuthUser, secret: string): string {
  return jwt.sign({ role: user.role }, secret, { subject: String(user.id), expiresIn: TOKEN_TTL });
}

function readToken(header: string | undefined, secret: string): AuthUser | null {
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), secret) as jwt.JwtPayload;
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || (payload.role !== 'member' && payload.role !== 'admin')) return null;
    return { id, role: payload.role };
  } catch {
    return null;
  }
}

/** El usuario autenticado se guarda en `res.locals.user` para las rutas siguientes. */
export function currentUser(res: Response): AuthUser | null {
  return (res.locals.user as AuthUser | undefined) ?? null;
}

export function requireUser(res: Response): AuthUser {
  const user = currentUser(res);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
  return user;
}

/** Lee el token si viene; no falla si no hay (las rutas públicas lo usan para personalizar). */
export const optionalAuth =
  (secret: string): RequestHandler =>
  (req, res, next) => {
    const user = readToken(req.headers.authorization, secret);
    if (user) res.locals.user = user;
    next();
  };

export const requireAuth: RequestHandler = (_req, res, next) => {
  requireUser(res);
  next();
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (requireUser(res).role !== 'admin') {
    throw new HttpError(403, 'FORBIDDEN', 'Solo los administradores pueden hacer esto.');
  }
  next();
};
