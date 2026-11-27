import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Plus, Search, Filter } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function EstimatesListPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('estimation.estimates.create');

  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadEstimates = async () => {
    try {
      const res = await apiClient.get<any[]>('/estimation/estimates?limit=100');
      setEstimates(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEstimates();
  }, []);

  const filtered = estimates.filter((est) => {
    const matchesSearch =
      !search ||
      est.title.toLowerCase().includes(search.toLowerCase()) ||
      est.estimateNumber.toLowerCase().includes(search.toLowerCase()) ||
      (est.projectLocation && est.projectLocation.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || est.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingSpinner label="Loading estimates..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Estimates & BOQs</h1>
            <p className="text-sm text-slate-500">
              Project cost breakdowns, material/labour quantities, markups, and revisions.
            </p>
          </div>
        </div>

        {canCreate && (
          <Link
            to="/estimation/estimates/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Estimate
          </Link>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search estimates by number, title, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REVISED">Revised</option>
          </select>
        </div>
      </div>

      {/* Estimates Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Estimate #</th>
              <th className="px-4 py-3">Title & Project</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Associated Client</th>
              <th className="px-4 py-3">Grand Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filtered.map((est) => (
              <tr key={est.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                  <Link to={`/estimation/estimates/${est.id}`} className="hover:underline">
                    {est.estimateNumber}
                  </Link>
                  <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.2 text-[10px] font-semibold text-slate-600">
                    R{est.revisionNumber}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{est.title}</div>
                  <div className="text-[11px] text-slate-500">{est.projectLocation || 'Location TBD'}</div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {est.projectCategory.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3">
                  {est.customer?.name || (est.lead?.customerName ? `${est.lead.customerName} (Lead)` : '—')}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  ₹{Number(est.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      est.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : est.status === 'UNDER_REVIEW'
                          ? 'bg-amber-50 text-amber-700'
                          : est.status === 'REVISED'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {est.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/estimation/estimates/${est.id}`}
                    className="inline-flex items-center rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open BOQ
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No estimates found. Click "New Estimate" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
