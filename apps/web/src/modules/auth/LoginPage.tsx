import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogIn, ShieldPlus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/auth/sign-in/email', { email, password });
      await refreshSession();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/auth/bootstrap', {
        organisationName: orgName,
        organisationSlug: orgSlug,
        adminName,
        adminEmail: email,
        adminPassword: password,
      });
      await apiClient.post('/auth/sign-in/email', { email, password });
      await refreshSession();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to setup organisation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AIW OS</h1>
            <p className="text-xs text-slate-500">Enterprise Operations Platform</p>
          </div>
        </div>

        <div className="mt-5 flex rounded-md bg-slate-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 rounded py-1.5 ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('bootstrap');
              setError(null);
            }}
            className={`flex-1 rounded py-1.5 ${
              mode === 'bootstrap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Setup Organisation
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBootstrap} className="mt-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Organisation Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setOrgSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
                  );
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="AIW India"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Organisation Slug</label>
              <input
                type="text"
                required
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="aiw-india"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Super Admin Name</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <ShieldPlus className="h-4 w-4" />
              {submitting ? 'Creating Organisation...' : 'Create Organisation & Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
