import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { GymClass } from '../api/types';
import { bookingAction, typeLabel } from '../lib/classTypes';
import { formatTime } from '../lib/dates';

interface Props {
  gymClass: GymClass;
  loggedIn: boolean;
  pending?: boolean;
  onBook?: () => void;
  onCancel?: () => void;
  /** Contenido extra (p. ej. botones de admin). */
  children?: ReactNode;
  now?: Date;
}

export function ClassCard({ gymClass: c, loggedIn, pending, onBook, onCancel, children, now }: Props) {
  const action = bookingAction(c, loggedIn, now);
  const location = useLocation();
  const fill = c.capacity ? c.booked / c.capacity : 0;
  const level = c.spotsLeft === 0 ? 'full' : fill >= 0.75 ? 'low' : 'ok';

  return (
    <article
      className={`class-card class-card--${c.type}${action.kind === 'disabled' && action.reason === 'Finalizada' ? ' class-card--past' : ''}`}
      aria-label={`${c.title}, ${formatTime(c.startsAt)}`}
    >
      <div className="class-card__time">
        <strong>{formatTime(c.startsAt)}</strong>
        <span>{c.durationMin} min</span>
      </div>

      <div className="class-card__body">
        <span className="tag">{typeLabel(c.type)}</span>
        <h3>{c.title}</h3>
        <p className="class-card__meta">
          {c.instructor} · {c.room}
        </p>
        <div className={`spots spots--${level}`}>
          <div className="spots__bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, fill * 100)}%` }} />
          </div>
          <span className="spots__text">
            {c.spotsLeft === 0
              ? 'Sin plazas'
              : `${c.spotsLeft} ${c.spotsLeft === 1 ? 'plaza libre' : 'plazas libres'}`}
          </span>
        </div>
      </div>

      <div className="class-card__action">
        {c.bookedByMe && <span className="badge">✓ Tienes plaza</span>}
        {action.kind === 'book' && (
          <button type="button" className="btn btn--primary" onClick={onBook} disabled={pending}>
            {pending ? 'Reservando…' : 'Reservar'}
          </button>
        )}
        {action.kind === 'cancel' && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            {pending ? 'Cancelando…' : 'Cancelar'}
          </button>
        )}
        {action.kind === 'login' && (
          <Link
            to="/login"
            state={{ from: location.pathname + location.search }}
            className="btn btn--outline"
          >
            Entrar para reservar
          </Link>
        )}
        {action.kind === 'disabled' && !c.bookedByMe && <span className="muted">{action.reason}</span>}
        {action.kind === 'disabled' && c.bookedByMe && action.reason === 'Reservada' && (
          <span className="muted small">Ya no se puede cancelar</span>
        )}
        {children}
      </div>
    </article>
  );
}
