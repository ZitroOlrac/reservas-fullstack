import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/auth';
import { ClassCard } from '../components/ClassCard';
import { ErrorState, Loading } from '../components/states';
import { CLASS_TYPES, isClassType } from '../lib/classTypes';
import { dayKey, dayLabel, dayNumber, nextDays, today, weekdayShort } from '../lib/dates';
import { useBooking, useClasses } from '../lib/queries';

const DAYS = 7;

export function Schedule() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const start = today();
  const days = nextDays(start, DAYS);

  // Día y tipo viven en la URL: se pueden compartir y sobreviven a recargar.
  const selectedDay = days.includes(params.get('dia') ?? '') ? params.get('dia')! : start;
  const typeParam = params.get('tipo');
  const type = isClassType(typeParam) ? typeParam : null;

  const classes = useClasses(start, DAYS);
  const booking = useBooking();

  const byDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof classes.data>>();
    for (const c of classes.data ?? []) {
      if (type && c.type !== type) continue;
      const key = dayKey(c.startsAt);
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return map;
  }, [classes.data, type]);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = byDay.get(selectedDay) ?? [];

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Gimnasio Pulso · Madrid</p>
        <h1>Reserva tu clase</h1>
        <p className="hero__text">
          Elige día y actividad. Puedes cancelar hasta 2 horas antes y liberar la plaza para otra persona.
        </p>
      </section>

      <div className="days" role="tablist" aria-label="Día">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === selectedDay}
            className={`day${d === selectedDay ? ' day--active' : ''}`}
            onClick={() => update('dia', d === start ? null : d)}
          >
            <span className="day__name">{d === start ? 'Hoy' : weekdayShort(d)}</span>
            <span className="day__num">{dayNumber(d)}</span>
            <span className="day__count">{byDay.get(d)?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="chips" role="group" aria-label="Tipo de clase">
        <button
          type="button"
          className={`chip${!type ? ' chip--on' : ''}`}
          aria-pressed={!type}
          onClick={() => update('tipo', null)}
        >
          Todas
        </button>
        {CLASS_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`chip chip--${t.value}${type === t.value ? ' chip--on' : ''}`}
            aria-pressed={type === t.value}
            onClick={() => update('tipo', type === t.value ? null : t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <h2 className="section-title">{dayLabel(selectedDay)}</h2>

      {classes.isPending ? (
        <Loading />
      ) : classes.isError ? (
        <ErrorState message={classes.error.message} onRetry={() => void classes.refetch()} />
      ) : list.length === 0 ? (
        <p className="empty">No hay clases{type ? ' de este tipo' : ''} este día.</p>
      ) : (
        <div className="class-list">
          {list.map((c) => (
            <ClassCard
              key={c.id}
              gymClass={c}
              loggedIn={!!user}
              pending={booking.isPending && booking.variables?.gymClass.id === c.id}
              onBook={() => booking.mutate({ gymClass: c, action: 'book' })}
              onCancel={() => booking.mutate({ gymClass: c, action: 'cancel' })}
            />
          ))}
        </div>
      )}
    </>
  );
}
