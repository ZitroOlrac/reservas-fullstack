import { useQuery } from '@tanstack/react-query';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { ClassType, GymClass } from '../api/types';
import { ErrorState, Loading } from '../components/states';
import { CLASS_TYPES } from '../lib/classTypes';
import { addDays, dayKey, dayLabel, formatTime, madridLocalToIso, today } from '../lib/dates';
import { useAdminClasses, useClasses } from '../lib/queries';

const EMPTY = {
  title: '',
  type: 'yoga' as ClassType,
  instructor: '',
  room: '',
  startsAt: `${addDays(today(), 1)}T18:00`,
  durationMin: '60',
  capacity: '12',
};

export function Admin() {
  const classes = useClasses(today(), 14);
  const { create, remove } = useAdminClasses();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);

  const fields = create.error instanceof ApiError ? create.error.fields : {};
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        ...form,
        startsAt: form.startsAt ? madridLocalToIso(form.startsAt) : '',
        durationMin: Number(form.durationMin),
        capacity: Number(form.capacity),
      },
      { onSuccess: () => setForm(EMPTY) },
    );
  }

  const totals = (classes.data ?? []).reduce(
    (acc, c) => ({ booked: acc.booked + c.booked, capacity: acc.capacity + c.capacity }),
    { booked: 0, capacity: 0 },
  );

  return (
    <>
      <h1 className="page-title">Panel de administración</h1>

      {classes.data && (
        <div className="stats">
          <div className="stat">
            <strong>{classes.data.length}</strong>
            <span>clases en 14 días</span>
          </div>
          <div className="stat">
            <strong>{totals.booked}</strong>
            <span>reservas</span>
          </div>
          <div className="stat">
            <strong>{totals.capacity ? Math.round((totals.booked / totals.capacity) * 100) : 0}%</strong>
            <span>ocupación media</span>
          </div>
          <div className="stat">
            <strong>{classes.data.filter((c) => c.spotsLeft === 0).length}</strong>
            <span>clases completas</span>
          </div>
        </div>
      )}

      <div className="admin">
        <form className="card admin__form" onSubmit={submit} noValidate>
          <h2>Nueva clase</h2>
          {create.error && !Object.keys(fields).length && (
            <p className="alert" role="alert">
              {create.error.message}
            </p>
          )}
          <label className="field">
            <span>Nombre</span>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="Ej.: HIIT al mediodía"
              aria-invalid={!!fields.title}
            />
            {fields.title && <small className="field__error">{fields.title}</small>}
          </label>
          <div className="field-row">
            <label className="field">
              <span>Tipo</span>
              <select value={form.type} onChange={set('type')}>
                {CLASS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sala</span>
              <input
                value={form.room}
                onChange={set('room')}
                placeholder="Sala 1"
                aria-invalid={!!fields.room}
              />
              {fields.room && <small className="field__error">{fields.room}</small>}
            </label>
          </div>
          <label className="field">
            <span>Monitor/a</span>
            <input value={form.instructor} onChange={set('instructor')} aria-invalid={!!fields.instructor} />
            {fields.instructor && <small className="field__error">{fields.instructor}</small>}
          </label>
          <label className="field">
            <span>Inicio (hora de Madrid)</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={set('startsAt')}
              aria-invalid={!!fields.startsAt}
            />
            {fields.startsAt && <small className="field__error">{fields.startsAt}</small>}
          </label>
          <div className="field-row">
            <label className="field">
              <span>Duración (min)</span>
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={form.durationMin}
                onChange={set('durationMin')}
                aria-invalid={!!fields.durationMin}
              />
              {fields.durationMin && <small className="field__error">{fields.durationMin}</small>}
            </label>
            <label className="field">
              <span>Plazas</span>
              <input
                type="number"
                min={1}
                max={100}
                value={form.capacity}
                onChange={set('capacity')}
                aria-invalid={!!fields.capacity}
              />
              {fields.capacity && <small className="field__error">{fields.capacity}</small>}
            </label>
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear clase'}
          </button>
        </form>

        <section className="admin__list" aria-labelledby="admin-list-title">
          <h2 id="admin-list-title" className="section-title">
            Próximas clases
          </h2>
          {classes.isPending ? (
            <Loading />
          ) : classes.isError ? (
            <ErrorState message={classes.error.message} onRetry={() => void classes.refetch()} />
          ) : (
            <ul className="admin-rows">
              {classes.data.map((c, i) => (
                <li key={c.id}>
                  {(i === 0 || dayKey(classes.data[i - 1].startsAt) !== dayKey(c.startsAt)) && (
                    <p className="day-heading">{dayLabel(dayKey(c.startsAt))}</p>
                  )}
                  <div className={`admin-row class-card--${c.type}`}>
                    <span className="admin-row__time">{formatTime(c.startsAt)}</span>
                    <span className="admin-row__title">
                      {c.title}
                      <small className="muted">
                        {c.instructor} · {c.room}
                      </small>
                    </span>
                    <span className={`admin-row__spots${c.spotsLeft === 0 ? ' is-full' : ''}`}>
                      {c.booked}/{c.capacity}
                    </span>
                    <span className="admin-row__actions">
                      <button
                        type="button"
                        className="link"
                        aria-expanded={open === c.id}
                        onClick={() => setOpen(open === c.id ? null : c.id)}
                      >
                        Asistentes
                      </button>
                      {confirm === c.id ? (
                        <>
                          <button
                            type="button"
                            className="link link--danger"
                            onClick={() => remove.mutate(c)}
                          >
                            ¿Borrar{c.booked ? ` y ${c.booked} reservas` : ''}?
                          </button>
                          <button type="button" className="link" onClick={() => setConfirm(null)}>
                            No
                          </button>
                        </>
                      ) : (
                        <button type="button" className="link" onClick={() => setConfirm(c.id)}>
                          Borrar
                        </button>
                      )}
                    </span>
                  </div>
                  {open === c.id && <Attendees gymClass={c} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Attendees({ gymClass }: { gymClass: GymClass }) {
  const attendees = useQuery({
    queryKey: ['attendees', gymClass.id, gymClass.booked],
    queryFn: () => api.attendees(gymClass.id),
  });

  if (attendees.isPending) return <p className="attendees muted">Cargando asistentes…</p>;
  if (attendees.isError) return <p className="attendees field__error">{attendees.error.message}</p>;
  if (attendees.data.length === 0) return <p className="attendees muted">Nadie apuntado todavía.</p>;
  return (
    <ol className="attendees">
      {attendees.data.map((a) => (
        <li key={a.id}>
          {a.name} <span className="muted">· {a.email}</span>
        </li>
      ))}
    </ol>
  );
}
