import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClassCard } from '../components/ClassCard';
import { ErrorState, Loading } from '../components/states';
import { dayKey, dayLabel } from '../lib/dates';
import { useBooking, useMyBookings } from '../lib/queries';

export function MyBookings() {
  const bookings = useMyBookings();
  const booking = useBooking();
  const [now] = useState(() => Date.now());

  if (bookings.isPending) return <Loading />;
  if (bookings.isError)
    return <ErrorState message={bookings.error.message} onRetry={() => void bookings.refetch()} />;

  const upcoming = bookings.data.filter((c) => Date.parse(c.endsAt) > now);
  const past = bookings.data.filter((c) => Date.parse(c.endsAt) <= now).reverse();

  return (
    <>
      <h1 className="page-title">Mis reservas</h1>

      <h2 className="section-title">Próximas ({upcoming.length})</h2>
      {upcoming.length === 0 ? (
        <div className="empty">
          <p>No tienes ninguna clase reservada.</p>
          <Link to="/" className="btn btn--primary">
            Ver horario
          </Link>
        </div>
      ) : (
        <div className="class-list">
          {upcoming.map((c, i) => (
            <div key={c.id}>
              {(i === 0 || dayKey(upcoming[i - 1].startsAt) !== dayKey(c.startsAt)) && (
                <p className="day-heading">{dayLabel(dayKey(c.startsAt))}</p>
              )}
              <ClassCard
                gymClass={c}
                loggedIn
                pending={booking.isPending && booking.variables?.gymClass.id === c.id}
                onCancel={() => booking.mutate({ gymClass: c, action: 'cancel' })}
              />
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="section-title">Historial</h2>
          <ul className="history">
            {past.map((c) => (
              <li key={c.id}>
                <span>{c.title}</span>
                <span className="muted">
                  {dayLabel(dayKey(c.startsAt))} · {c.instructor}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
