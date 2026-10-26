import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api/client';
import type { GymClass, NewClass } from '../api/types';
import { useAuth } from '../auth/auth';
import { useToast } from '../components/toast';
import { formatTime } from './dates';

/** Las claves incluyen el id del usuario: cada usuario tiene su propia caché de "reservado por mí". */
export function useClasses(from: string, days: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['classes', from, days, user?.id ?? null],
    queryFn: () => api.classes({ from, days }),
  });
}

export function useMyBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: api.myBookings,
    enabled: !!user,
  });
}

/** Reservar o cancelar: avisa con un toast y refresca horario y "mis reservas". */
export function useBooking() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ gymClass, action }: { gymClass: GymClass; action: 'book' | 'cancel' }) =>
      action === 'book' ? api.book(gymClass.id) : api.cancel(gymClass.id),
    onSuccess: (_updated, { gymClass, action }) => {
      toast(
        action === 'book'
          ? `¡Reservado! ${gymClass.title} a las ${formatTime(gymClass.startsAt)}.`
          : `Reserva cancelada: ${gymClass.title}.`,
      );
    },
    onError: (error) => {
      toast(error instanceof ApiError ? error.message : 'No se pudo completar la acción.', 'error');
    },
    // Tanto si sale bien como si no (p. ej. alguien ocupó la última plaza), se recargan los datos.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useAdminClasses() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['classes'] });

  const create = useMutation({
    mutationFn: (data: NewClass) => api.createClass(data),
    onSuccess: (c) => {
      toast(`Clase creada: ${c.title}.`);
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (c: GymClass) => api.deleteClass(c.id),
    onSuccess: (_r, c) => {
      toast(`Clase eliminada: ${c.title}.`);
      void refresh();
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'No se pudo borrar.', 'error'),
  });

  return { create, remove };
}
