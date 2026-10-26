import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/auth';

const DEMO = {
  member: { email: 'demo@pulso.test', password: 'demo1234', label: 'Socia de prueba' },
  admin: { email: 'admin@pulso.test', password: 'admin1234', label: 'Administrador' },
};

/** Login y registro comparten pantalla; `mode` decide qué campos se muestran. */
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const isRegister = mode === 'register';
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent, override?: { email: string; password: string }) {
    e.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);
    try {
      const data = override ?? form;
      if (isRegister && !override) await register(form.name, data.email, data.password);
      else await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError('Algo salió mal. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <form className="card auth__form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{isRegister ? 'Crea tu cuenta' : 'Entra en Pulso'}</h1>
        <p className="muted">
          {isRegister ? 'Y reserva tu primera clase en un minuto.' : 'Para reservar y ver tus clases.'}
        </p>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {isRegister && (
          <label className="field">
            <span>Nombre</span>
            <input
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              aria-invalid={!!fields.name}
            />
            {fields.name && <small className="field__error">{fields.name}</small>}
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            aria-invalid={!!fields.email}
          />
          {fields.email && <small className="field__error">{fields.email}</small>}
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            aria-invalid={!!fields.password}
          />
          {fields.password && <small className="field__error">{fields.password}</small>}
          {isRegister && !fields.password && <small className="muted">Mínimo 8 caracteres.</small>}
        </label>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Entrar'}
        </button>

        <p className="auth__switch">
          {isRegister ? '¿Ya tienes cuenta? ' : '¿Eres nuevo? '}
          <Link to={isRegister ? '/login' : '/registro'} state={location.state}>
            {isRegister ? 'Entra' : 'Crea una cuenta'}
          </Link>
        </p>
      </form>

      {!isRegister && (
        <aside className="card demo">
          <h2>Probar sin registrarte</h2>
          <p className="muted">Cuentas de prueba con datos de ejemplo:</p>
          {Object.values(DEMO).map((d) => (
            <button
              key={d.email}
              type="button"
              className="demo__account"
              disabled={submitting}
              onClick={(e) => void submit(e, d)}
            >
              <strong>{d.label}</strong>
              <span>{d.email}</span>
            </button>
          ))}
        </aside>
      )}
    </div>
  );
}
