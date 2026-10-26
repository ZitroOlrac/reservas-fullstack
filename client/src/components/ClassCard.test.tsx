import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GymClass } from '../api/types';
import { ClassCard } from './ClassCard';

const NOW = new Date('2026-10-26T10:00:00.000Z');
const base: GymClass = {
  id: 1,
  title: 'Spinning Power',
  type: 'spinning',
  instructor: 'Diego Ramos',
  room: 'Sala Bici',
  startsAt: '2026-10-26T19:30:00.000Z',
  endsAt: '2026-10-26T20:15:00.000Z',
  durationMin: 45,
  capacity: 16,
  booked: 15,
  spotsLeft: 1,
  bookedByMe: false,
};

const renderCard = (props: Partial<Parameters<typeof ClassCard>[0]> = {}) =>
  render(
    <MemoryRouter>
      <ClassCard gymClass={base} loggedIn now={NOW} {...props} />
    </MemoryRouter>,
  );

describe('<ClassCard />', () => {
  it('muestra hora de Madrid, datos y plazas en singular', () => {
    renderCard();
    expect(screen.getByText('20:30')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Spinning Power' })).toBeInTheDocument();
    expect(screen.getByText('Diego Ramos · Sala Bici')).toBeInTheDocument();
    expect(screen.getByText('1 plaza libre')).toBeInTheDocument();
  });

  it('llama a onBook al pulsar Reservar', async () => {
    const onBook = vi.fn();
    renderCard({ onBook });
    await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
    expect(onBook).toHaveBeenCalledOnce();
  });

  it('muestra Cancelar si ya tiene plaza', async () => {
    const onCancel = vi.fn();
    renderCard({ gymClass: { ...base, bookedByMe: true }, onCancel });
    expect(screen.getByText('✓ Tienes plaza')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('sin sesión enlaza al login', () => {
    renderCard({ loggedIn: false });
    expect(screen.getByRole('link', { name: 'Entrar para reservar' })).toHaveAttribute('href', '/login');
  });

  it('desactiva el botón mientras se procesa', () => {
    renderCard({ pending: true });
    expect(screen.getByRole('button', { name: 'Reservando…' })).toBeDisabled();
  });

  it('indica cuando está completa', () => {
    renderCard({ gymClass: { ...base, booked: 16, spotsLeft: 0 } });
    expect(screen.getByText('Sin plazas')).toBeInTheDocument();
    expect(screen.getByText('Completa')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
