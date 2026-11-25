import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Users, UserX, UserCheck } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  status: string;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  userRoles: { role: { id: string; name: string; code: string } }[];
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await apiClient.get<UserRecord[]>('/users');
      setUsers(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/users', { name, email, password });
      setName('');
      setEmail('');
      setPassword('');
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    }
  };

  const toggleStatus = async (user: UserRecord) => {
    setError(null);
    try {
      const action = user.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
      await apiClient.post(`/users/${user.id}/${action}`, {});
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update user status');
    }
  };

  if (loading) return <LoadingSpinner label="Loading users..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Create, activate, and deactivate organisation users.</p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          required
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Initial Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-52 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Create User
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {u.userRoles.map((ur) => ur.role.name).join(', ') || 'No roles'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void toggleStatus(u)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {u.status === 'ACTIVE' ? (
                      <>
                        <UserX className="h-3.5 w-3.5 text-red-600" /> Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Reactivate
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
