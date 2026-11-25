import { useEffect, useState, type FormEvent } from 'react';
import { Shield, Plus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface RoleRecord {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystemRole: boolean;
  rolePermissions: { permission: { id: string; code: string; module: string } }[];
}

export function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = async () => {
    try {
      const res = await apiClient.get<RoleRecord[]>('/roles');
      setRoles(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/roles', { name, code });
      setName('');
      setCode('');
      await loadRoles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create role');
    }
  };

  if (loading) return <LoadingSpinner label="Loading roles & permissions..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Roles & Permissions</h1>
          <p className="text-sm text-slate-500">Organisation-scoped RBAC roles and permission mappings.</p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          required
          placeholder="Role Name (e.g. Project Manager)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          required
          placeholder="Code (e.g. PROJECT_MANAGER)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
          className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </form>

      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{role.name}</h2>
                <p className="text-xs text-slate-500">
                  {role.code} {role.isSystemRole ? '• System Role' : ''}
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {role.rolePermissions.length} permissions
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.rolePermissions.map((rp) => (
                <span
                  key={rp.permission.id}
                  className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                >
                  {rp.permission.code}
                </span>
              ))}
              {role.rolePermissions.length === 0 && (
                <span className="text-xs text-slate-400">No permissions assigned</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
