import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface DashboardData {
  summary: {
    totalLeads: number;
    openLeads: number;
    wonLeads: number;
    lostLeads: number;
    archivedLeads: number;
    totalCustomers: number;
    conversionRate: number;
    overdueFollowUps: number;
    pendingFollowUps: number;
    scheduledSiteVisits: number;
  };
  leadsByPriority: Array<{ priority: string; count: number }>;
  leadsByStage: Array<{
    stageId: string | null;
    stageName: string;
    stageColor: string | null;
    count: number;
  }>;
  leadsBySource: Array<{
    sourceId: string | null;
    sourceName: string;
    count: number;
  }>;
  recentLeads: Array<{
    id: string;
    leadNumber: string;
    customerName: string;
    priority: string;
    status: string;
    createdAt: string;
    pipelineStage?: { name: string; color: string | null } | null;
    assignedUser?: { name: string } | null;
  }>;
}

export function CrmOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await apiClient.get<DashboardData>('/crm/dashboard');
        setData(res.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load CRM dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner label="Loading CRM overview..." />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">Error loading CRM Dashboard</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Overview</h1>
          <p className="text-sm text-slate-500">Real-time pipeline, conversion metrics, and acquisition status</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/crm/leads/create"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            New Lead
          </Link>
          <Link
            to="/crm/pipeline"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Kanban Board
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Open Leads</span>
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.openLeads ?? 0}</span>
            <span className="text-xs text-slate-500">of {summary?.totalLeads ?? 0} total</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Won Customers</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.wonLeads ?? 0}</span>
            <span className="text-xs text-emerald-600 font-medium">{summary?.conversionRate ?? 0}% win rate</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Pending Follow-ups</span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.pendingFollowUps ?? 0}</span>
            {(summary?.overdueFollowUps ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                <AlertCircle className="h-3 w-3" />
                {summary?.overdueFollowUps} overdue
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Scheduled Site Visits</span>
            <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.scheduledSiteVisits ?? 0}</span>
            <span className="text-xs text-slate-500">active visits</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-900">Leads by Pipeline Stage</h2>
            <Link to="/crm/pipeline" className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              View Board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data?.leadsByStage && data.leadsByStage.length > 0 ? (
              data.leadsByStage.map((stage) => {
                const total = summary?.openLeads || 1;
                const pct = Math.round((stage.count / total) * 100);
                return (
                  <div key={stage.stageId || 'unknown'}>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>{stage.stageName}</span>
                      <span className="font-semibold text-slate-900">{stage.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: stage.stageColor || '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No active stages or leads yet.</p>
            )}
          </div>
        </div>

        {/* Lead Sources & Priorities */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">Lead Sources</h2>
            <div className="mt-4 space-y-2.5">
              {data?.leadsBySource && data.leadsBySource.length > 0 ? (
                data.leadsBySource.map((s) => (
                  <div key={s.sourceId || 'unknown'} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{s.sourceName}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {s.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-2 text-center">No source data</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">Priority Distribution</h2>
            <div className="mt-4 flex gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => {
                const count = data?.leadsByPriority.find((item) => item.priority === p)?.count || 0;
                return (
                  <div key={p} className="flex-1 rounded-lg bg-slate-50 p-2.5 text-center border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">{p}</span>
                    <span className="mt-1 block text-lg font-bold text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Recent Enquiries & Leads</h2>
          <Link to="/crm/leads" className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            All Leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Lead ID</th>
                <th className="px-6 py-3">Customer Name</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Assigned To</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentLeads && data.recentLeads.length > 0 ? (
                data.recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{lead.leadNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{lead.customerName}</td>
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
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No leads found. Create your first lead to see it here!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
