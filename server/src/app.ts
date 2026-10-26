import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { optionalAuth } from './auth.ts';
import type { Db } from './db.ts';
import { HttpError, errorHandler } from './errors.ts';
import { apiRouter } from './routes.ts';

export interface AppOptions {
  db: Db;
  jwtSecret: string;
  /** Inyectable para poder testear reglas que dependen de la hora. */
  now?: () => Date;
  /** Carpeta con el frontend compilado. Si existe, el mismo servidor lo sirve. */
  clientDir?: string;
}

export function createApp({ db, jwtSecret, now = () => new Date(), clientDir }: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  app.use(optionalAuth(jwtSecret));

  app.use('/api', apiRouter({ db, jwtSecret, now }));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada.')));

  if (clientDir && existsSync(join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir, { maxAge: '1h', index: false }));
    // SPA: cualquier otra ruta devuelve index.html y React Router decide qué pintar.
    app.get('/{*path}', (_req, res) => res.sendFile(join(clientDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
