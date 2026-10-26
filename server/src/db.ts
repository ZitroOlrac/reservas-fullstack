import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/** Abre (o crea) la base de datos y aplica el esquema. Con ':memory:' se usa en los tests. */
export function openDb(path: string): Db {
  const db = new DatabaseSync(path);
  db.exec(schema);
  return db;
}

/**
 * Ejecuta `fn` dentro de una transacción: o se guardan todos los cambios o ninguno.
 * BEGIN IMMEDIATE bloquea la escritura desde el principio, así dos reservas
 * simultáneas no pueden ocupar la última plaza a la vez.
 */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
