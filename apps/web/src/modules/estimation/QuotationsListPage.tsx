import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export function QuotationsListPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadQuotations = async () => {
    try {
      const res = await apiClient.get<any[]>('/estimation/quotations?limit=100');
      setQuotations(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuotations();
  }, []);

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      !search ||
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer?.name && q.customer.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingSpinner label="Loading quotations..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Commercial Quotations</h1>
            <p className="text-sm text-slate-500">
              Formal client proposals, owner approval queues, PDF exports, and dispatch tracking.
            </p>
          </div>
        </div>

        <Link
          to="/estimation/estimates"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          View Estimates
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations by quote #, title or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Quotations Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Quote #</th>
              <th className="px-4 py-3">Quotation Title</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Linked Estimate</th>
              <th className="px-4 py-3">Grand Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filtered.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                  <Link to={`/estimation/quotations/${q.id}`} className="hover:underline">
                    {q.quotationNumber}
                  </Link>
                  <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.2 text-[10px] font-semibold text-slate-600">
                    Rev {q.revisionNumber}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{q.title}</td>
                <td className="px-4 py-3">{q.customer?.name || 'Prospect'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                  {q.estimate?.estimateNumber}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  ₹{Number(q.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      q.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : q.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700'
                          : q.status === 'DISPATCHED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {q.status === 'APPROVED' && <CheckCircle className="h-3 w-3" />}
                    {q.status === 'PENDING_APPROVAL' && <Clock className="h-3 w-3" />}
                    {q.status === 'DISPATCHED' && <Send className="h-3 w-3" />}
                    {q.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/estimation/quotations/${q.id}`}
                    className="inline-flex items-center rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No quotations found. Open an estimate and click "Generate Quotation".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
