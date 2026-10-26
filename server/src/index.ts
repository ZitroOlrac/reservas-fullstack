import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { openDb } from './db.ts';
import { ensureDemoData } from './seed.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.DATABASE_PATH ?? resolve(root, 'server/data/pulso.db');
const JWT_SECRET = process.env.JWT_SECRET ?? 'solo-para-desarrollo-cambiar-en-produccion';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET.');
  process.exit(1);
}

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = openDb(DB_PATH);

// Datos de ejemplo y horario siempre relleno para las próximas dos semanas.
ensureDemoData(db, new Date());
setInterval(() => ensureDemoData(db, new Date()), 6 * 60 * 60 * 1000).unref();

const app = createApp({ db, jwtSecret: JWT_SECRET, clientDir: resolve(root, 'client/dist') });

app.listen(PORT, () => {
  console.log(`API de Pulso escuchando en http://localhost:${PORT}`);
});
