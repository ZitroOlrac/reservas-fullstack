import { z } from 'zod';
import { CLASS_TYPES } from './services/classes.ts';

/** Validación de todo lo que entra por la API. Si algo no cumple, el errorHandler responde 400. */

const email = z.string().trim().toLowerCase().pipe(z.email('Email no válido.'));

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(60),
  email,
  password: z.string().min(8, 'Mínimo 8 caracteres.').max(100),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Obligatorio.'),
});

export const classSchema = z.object({
  title: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(60),
  type: z.enum(CLASS_TYPES, 'Tipo de clase no válido.'),
  instructor: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(60),
  room: z.string().trim().min(1, 'Obligatorio.').max(30),
  // Se normaliza a ISO en UTC para que las comparaciones de texto en SQL funcionen.
  startsAt: z.iso
    .datetime({ offset: true, message: 'Fecha no válida.' })
    .transform((v) => new Date(v).toISOString()),
  durationMin: z.coerce.number().int().min(15, 'Mínimo 15 minutos.').max(180, 'Máximo 180 minutos.'),
  capacity: z.coerce.number().int().min(1, 'Mínimo 1 plaza.').max(100, 'Máximo 100 plazas.'),
});

export const listQuerySchema = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(31).default(7),
  type: z.enum(CLASS_TYPES).optional(),
});

export const idParam = z.coerce.number().int().positive();
