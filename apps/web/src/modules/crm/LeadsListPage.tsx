import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { PermissionGate } from '@/lib/auth/usePermission';

interface Lead {
  id: string;
  leadNumber: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  propertyType: string | null;
  projectCategory: string | null;
  estimatedBudget: number | null;
  priority: string;
  status: string;
  nextFollowUpDate: string | null;
  createdAt: string;
  source?: { id: string; name: string } | null;
  assignedUser?: { id: string; name: string } | null;
  pipelineStage?: { id: string; name: string; color: string | null } | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function LeadsListPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);

      const res = await apiClient.get<Lead[]>(`/crm/leads?${params.toString()}`);
      setLeads(res.data);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination as PaginationMeta);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">Track and manage potential clients and acquisition pipeline</p>
        </div>
        <PermissionGate permission="crm.leads.create">
          <Link
            to="/crm/leads/create"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Create Lead
          </Link>
        </PermissionGate>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by customer name, phone, email, lead ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner label="Loading leads..." />
          </div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base font-semibold text-slate-700">No leads found</p>
            <p className="mt-1 text-sm text-slate-400">Try adjusting your filters or create a new lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Lead ID</th>
                  <th className="px-6 py-3">Customer Details</th>
                  <th className="px-6 py-3">Project / Property</th>
                  <th className="px-6 py-3">Stage</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Assigned To</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      <Link to={`/crm/leads/${lead.id}`} className="text-blue-600 hover:underline">
                        {lead.leadNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{lead.customerName}</div>
                      <div className="mt-0.5 flex flex-col text-xs text-slate-500">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700">
                      <div>{lead.propertyType || '—'}</div>
                      <div className="text-slate-400">{lead.projectCategory || 'General'}</div>
                      {lead.estimatedBudget && (
                        <div className="font-semibold text-slate-800 mt-0.5">
                          ₹{Number(lead.estimatedBudget).toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${lead.pipelineStage?.color ?? '#e2e8f0'}20`,
                          color: lead.pipelineStage?.color ?? '#475569',
                        }}
                      >
                        {lead.pipelineStage?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          lead.priority === 'URGENT'
                            ? 'bg-red-100 text-red-800'
                            : lead.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : lead.priority === 'MEDIUM'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{lead.assignedUser?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          lead.status === 'WON'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.status === 'LOST'
                            ? 'bg-rose-100 text-rose-800'
                            : lead.status === 'ARCHIVED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/crm/leads/${lead.id}`}
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{(page - 1) * 15 + 1}</span> to{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(page * 15, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{pagination.total}</span> leads
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              {page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
