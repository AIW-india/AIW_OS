import { useEffect, useState, type FormEvent } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface Department {
  id: string;
  name: string;
  code: string;
  status: string;
}

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = async () => {
    try {
      const res = await apiClient.get<Department[]>('/departments');
      setDepartments(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/departments', { name, code });
      setName('');
      setCode('');
      await loadDepartments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create department');
    }
  };

  if (loading) return <LoadingSpinner label="Loading departments..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <FolderTree className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500">Dynamic organisation departments.</p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          required
          placeholder="Department Name (e.g. Projects)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          required
          placeholder="Code (e.g. PROJ)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {departments.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.code}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No departments created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
