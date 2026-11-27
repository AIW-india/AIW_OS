import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  Plus,
  Users,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function ProjectsDashboardPage() {
  const { hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await apiClient.get<any>('/projects/dashboard/metrics');
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to load project dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    }
    void fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner label="Loading projects dashboard..." />;

  const canCreate = hasPermission('projects.create');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            Projects & Execution Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time oversight of construction & interior deliveries, active milestones, and task schedules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Link
              to="/projects/create"
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          )}
          <Link
            to="/projects/list"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            View All Projects
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Projects</span>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{metrics?.totalProjects || 0}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600">Active Execution</span>
            <PlayCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{metrics?.activeProjects || 0}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600">Not Started</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{metrics?.notStartedProjects || 0}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{metrics?.completedProjects || 0}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600">Delayed</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{metrics?.delayedProjects || 0}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">On Hold</span>
            <PauseCircle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-600">{metrics?.onHoldProjects || 0}</div>
        </div>
      </div>

      {/* Task & Milestone Highlights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <CheckSquare className="h-4 w-4 text-indigo-600" />
            Execution Action Items
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-rose-50 border border-rose-100">
              <span className="text-xs font-semibold text-rose-800">Overdue Tasks</span>
              <span className="text-lg font-bold text-rose-700">{metrics?.overdueTasks || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800">Upcoming Milestones</span>
              <span className="text-lg font-bold text-emerald-700">{metrics?.upcomingMilestones || 0}</span>
            </div>
          </div>
        </div>

        {/* Projects By Category */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-indigo-600" />
            Projects By Category
          </h2>
          <div className="space-y-2">
            {metrics?.byCategory && Object.keys(metrics.byCategory).length > 0 ? (
              Object.entries(metrics.byCategory).map(([cat, count]: any) => (
                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="font-medium text-slate-700">{cat.replace(/_/g, ' ')}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-800">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">No categories recorded yet.</div>
            )}
          </div>
        </div>

        {/* Projects By Project Manager */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-indigo-600" />
            Leadership & Project Managers
          </h2>
          <div className="space-y-2">
            {metrics?.byProjectManager && metrics.byProjectManager.length > 0 ? (
              metrics.byProjectManager.map((pm: any) => (
                <div key={pm.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="font-medium text-slate-700">{pm.name}</span>
                  <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 font-bold">{pm.count} projects</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">No assignments recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
