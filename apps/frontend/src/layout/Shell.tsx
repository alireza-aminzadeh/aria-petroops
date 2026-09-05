import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, clearToken, getUser, setUser, SessionUser } from '../lib/api';

const links = [
  { to: '/', label: 'داشبورد تله‌متری' },
  { to: '/assets', label: 'دارایی‌ها (ISA-95)' },
  { to: '/work-orders', label: 'دستور کار' },
  { to: '/maintenance', label: 'برنامه نت' },
  { to: '/ai', label: 'دستیار هوشمند' },
];

export function Shell() {
  const navigate = useNavigate();
  const [user, setUserState] = useState<SessionUser | null>(getUser());

  useEffect(() => {
    api<SessionUser>('/auth/me')
      .then((me) => {
        setUser(me);
        setUserState(me);
      })
      .catch(() => {
        clearToken();
        navigate('/login');
      });
  }, [navigate]);

  return (
    <div className="min-h-screen grid grid-cols-[16rem_1fr]">
      <aside className="border-l border-line bg-panel/90 px-5 py-6 flex flex-col gap-8">
        <div>
          <p className="text-xs tracking-[0.2em] text-brass">ARIA PETROOPS</p>
          <h1 className="text-xl mt-1 font-semibold">پتروپایش</h1>
          <p className="text-sm text-muted mt-1">هوشمندی دارایی و نت</p>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-brass text-ink font-medium'
                    : 'text-paper/80 hover:bg-panel-2'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          {user ? (
            <p className="text-xs text-muted mb-3">
              {user.fullName}
              <span className="block font-mono text-brass/80">{user.username}</span>
            </p>
          ) : null}
          <button
            className="text-sm text-muted hover:text-rust"
            onClick={() => {
              clearToken();
              navigate('/login');
            }}
          >
            خروج
          </button>
        </div>
      </aside>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}
