import { useEffect, useState, type FormEvent } from 'react';
import { Hammer, Plus, Search } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function LabourRateLibraryPage() {
  const { hasPermission } = useAuth();
  const canManageRates = hasPermission('estimation.rates.manage');

  const [rates, setRates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Labour Rate State
  const [code, setCode] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [unit, setUnit] = useState('SQFT');
  const [standardRate, setStandardRate] = useState<number>(0);
  const [categoryId, setCategoryId] = useState('');

  const loadData = async () => {
    try {
      const [rateRes, catRes] = await Promise.all([
        apiClient.get<any[]>('/estimation/labour'),
        apiClient.get<any[]>('/estimation/labour/categories'),
      ]);
      setRates(rateRes.data);
      setCategories(catRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load labour rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/estimation/labour', {
        code,
        workDescription,
        unit,
        standardRate: Number(standardRate),
        categoryId: categoryId || undefined,
      });
      setCode('');
      setWorkDescription('');
      setStandardRate(0);
      setShowAddForm(false);
      setSuccess('Labour rate specification added.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add labour rate');
    }
  };

  const filtered = rates.filter((r) => {
    return (
      !search ||
      r.workDescription.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) return <LoadingSpinner label="Loading labour specifications..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Hammer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Labour & Service Rates</h1>
            <p className="text-sm text-slate-500">
              Standard civil, tiling, electrical, plumbing, carpentry, and painting labour rates.
            </p>
          </div>
        </div>

        {canManageRates && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Labour Rate
          </button>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
      {success && (
        <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          {success}
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Add Labour Rate Specification</h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="text"
              required
              placeholder="Code (e.g. LAB-FLR-001)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none font-mono"
            />
            <input
              type="text"
              required
              placeholder="Work Description (e.g. Italian Marble Laying & Mirror Polishing)"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="SQFT">Square Feet (SQFT)</option>
              <option value="RFT">Running Feet (RFT)</option>
              <option value="POINT">Electrical Point</option>
              <option value="DAY">Day Shift</option>
              <option value="NOS">Numbers (NOS)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="number"
              required
              step="0.01"
              placeholder="Standard Rate (INR)"
              value={standardRate || ''}
              onChange={(e) => setStandardRate(parseFloat(e.target.value) || 0)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="">Category (Optional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Save Labour Rate
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search labour rates by code or work description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Work Description</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Standard Rate</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{r.code}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.workDescription}</td>
                <td className="px-4 py-3 font-mono">{r.unit}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  ₹{Number(r.standardRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No labour rates found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
