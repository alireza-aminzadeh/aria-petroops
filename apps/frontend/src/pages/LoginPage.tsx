import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUser, SessionUser } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('alireza');
  const [password, setPassword] = useState('alireza');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ accessToken: string; user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(result.accessToken);
      setUser(result.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-2xl"
      >
        <p className="text-brass text-xs tracking-[0.25em]">ARIA AI</p>
        <h1 className="text-2xl mt-2 font-semibold">ورود به پتروپایش</h1>
        <p className="text-muted text-sm mt-2">
          سامانهٔ هوشمندی دارایی، فرآیند و انرژی
        </p>
        <label className="block mt-6 text-sm">نام کاربری</label>
        <input
          className="mt-1 w-full rounded-lg bg-ink border border-line px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <label className="block mt-4 text-sm">رمز عبور</label>
        <input
          className="mt-1 w-full rounded-lg bg-ink border border-line px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
        />
        {error ? <p className="text-rust text-sm mt-3">{error}</p> : null}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brass text-ink font-medium py-2.5 disabled:opacity-60"
        >
          {loading ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>
    </div>
  );
}
