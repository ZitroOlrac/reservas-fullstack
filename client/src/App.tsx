import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/auth';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { Loading } from './components/states';
import { Admin } from './pages/Admin';
import { AuthPage } from './pages/AuthPage';
import { MyBookings } from './pages/MyBookings';
import { Schedule } from './pages/Schedule';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

/** Rutas privadas: sin sesión, al login (y luego de vuelta aquí). */
function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="empty">
      <h1 className="page-title">Página no encontrada</h1>
      <Link to="/" className="btn btn--primary">
        Volver al horario
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Schedule />} />
                <Route path="login" element={<AuthPage mode="login" />} />
                <Route path="registro" element={<AuthPage mode="register" />} />
                <Route
                  path="mis-reservas"
                  element={
                    <RequireAuth>
                      <MyBookings />
                    </RequireAuth>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <RequireAuth admin>
                      <Admin />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
