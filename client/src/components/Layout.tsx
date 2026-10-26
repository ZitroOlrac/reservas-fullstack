import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <NavLink to="/" className="logo" aria-label="Pulso, inicio">
            <span className="logo__mark" aria-hidden="true" />
            Pulso
          </NavLink>
          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end>
              Horario
            </NavLink>
            {user && <NavLink to="/mis-reservas">Mis reservas</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <div className="header__user">
            {user ? (
              <>
                <span className="avatar" aria-hidden="true">
                  {user.name.charAt(0)}
                </span>
                <span className="header__name">{user.name.split(' ')[0]}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Salir
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn btn--primary btn--sm">
                Entrar
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer container">
        Proyecto de portafolio · Node.js + Express + SQLite + React ·{' '}
        <a href="https://github.com/ZitroOlrac/reservas-fullstack">Código en GitHub</a>
      </footer>
    </>
  );
}
