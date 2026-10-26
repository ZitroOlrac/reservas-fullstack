import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ApiError, api, tokenStore } from '../api/client';
import type { AuthResponse } from '../api/types';
import { AuthContext, type AuthContextValue } from './auth';

/**
 * Guarda el token JWT y expone el usuario actual.
 * El usuario se pide a /api/me con React Query, así se valida el token guardado al recargar.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStore.get());

  const me = useQuery({
    queryKey: ['me', token],
    // Token caducado o inválido: se descarta y se sigue como invitado.
    queryFn: async () => {
      try {
        return await api.me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          tokenStore.set(null);
          return null;
        }
        throw error;
      }
    },
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  const logout = useCallback(() => {
    tokenStore.set(null);
    setToken(null);
    // Los datos cacheados dependen del usuario (qué clases tiene reservadas): se descartan.
    queryClient.clear();
  }, [queryClient]);

  const startSession = useCallback(
    ({ token: newToken, user }: AuthResponse) => {
      tokenStore.set(newToken);
      queryClient.clear();
      queryClient.setQueryData(['me', newToken], user);
      setToken(newToken);
      return user;
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? (me.data ?? null) : null,
      loading: !!token && me.isPending,
      login: async (email, password) => startSession(await api.login(email, password)),
      register: async (name, email, password) => startSession(await api.register(name, email, password)),
      logout,
    }),
    [token, me.data, me.isPending, startSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
