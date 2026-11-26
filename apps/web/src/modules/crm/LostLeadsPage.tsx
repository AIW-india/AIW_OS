import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  Search,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface LostLead {
  id: string;
  leadNumber: string;
  customerName: string;
  phone: string | null;
  location: string | null;
  estimatedBudget: number | null;
  lostRemarks: string | null;
  updatedAt: string;
  lostReason?: { name: string } | null;
  assignedUser?: { name: string } | null;
}

export function LostLeadsPage() {
  const [leads, setLeads] = useState<LostLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLostLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<LostLead[]>('/crm/leads?status=LOST&limit=50');
      setLeads(res.data || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch lost leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLostLeads();
  }, [fetchLostLeads]);

  const handleRestore = async (id: string) => {
    if (!window.confirm('Reopen this lost lead back to Open status?')) return;
    try {
      await apiClient.post(`/crm/leads/${id}/restore`, {});
      fetchLostLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to restore lead');
    }
  };

  const filtered = leads.filter(
    (l) =>
      l.customerName.toLowerCase().includes(search.toLowerCase()) ||
      l.leadNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lost Leads Analysis</h1>
          <p className="text-sm text-slate-500">Review non-converting enquiries and customer feedback reasons</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter lost leads by customer name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner label="Loading lost leads report..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No lost leads found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Lead ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Estimated Budget</th>
                  <th className="px-6 py-3">Lost Reason / Feedback</th>
                  <th className="px-6 py-3">Closed Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      <Link to={`/crm/leads/${l.id}`} className="text-blue-600 hover:underline">
                        {l.leadNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{l.customerName}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {l.estimatedBudget ? `₹${Number(l.estimatedBudget).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-rose-700 font-medium">
                      {l.lostReason?.name || l.lostRemarks || 'Reason not recorded'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(l.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRestore(l.id)}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 mr-2"
                      >
                        Reopen
                      </button>
                      <Link
                        to={`/crm/leads/${l.id}`}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <Eye className="h-3 w-3" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
