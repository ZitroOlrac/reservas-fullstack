import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/** Error con código HTTP y un código estable que el frontend puede usar para decidir qué mostrar. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} no existe.`);

/** Middleware final: convierte cualquier error en una respuesta JSON con el mismo formato. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos enviados.',
        fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
      },
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'El cuerpo no es un JSON válido.' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor.' } });
};
