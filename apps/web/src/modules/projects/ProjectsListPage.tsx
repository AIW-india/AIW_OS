import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function ProjectsListPage() {
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const res = await apiClient.get<any[]>(`/projects?${params.toString()}`);
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, categoryFilter]);

  const canCreate = hasPermission('projects.create');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            <PlayCircle className="h-3 w-3" /> In Progress
          </span>
        );
      case 'NOT_STARTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <Clock className="h-3 w-3" /> Not Started
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            <PauseCircle className="h-3 w-3" /> On Hold
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
            <AlertTriangle className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Active and completed execution projects across residential, commercial, and turnkey contracts.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/projects/create"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project name, project #, or site location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
            <option value="RESIDENTIAL_CONSTRUCTION">Residential Construction</option>
            <option value="COMMERCIAL_INTERIOR">Commercial Interior</option>
            <option value="COMMERCIAL_CONSTRUCTION">Commercial Construction</option>
            <option value="RENOVATION">Renovation & Remodel</option>
            <option value="TURNKEY">Turnkey Delivery</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner label="Fetching projects..." />
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center bg-white">
          <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No projects found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'Try modifying your search or filter settings.'
              : 'Create a new project from an accepted quotation to get started.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project Manager</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{p.projectNumber}</div>
                    {p.siteAddress && <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.siteAddress}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {p.customer ? (
                      <div>
                        <div className="font-medium text-slate-800">{p.customer.name}</div>
                        <div className="text-[11px] text-slate-400">{p.customer.phone || 'No phone'}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No customer linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.projectManager ? (
                      <span className="font-medium text-slate-800">{p.projectManager.name}</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {p.projectCategory.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                        <span>{Number(p.progressPercentage || 0).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, Number(p.progressPercentage || 0)))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Manage <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
