import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  FileSpreadsheet,
  FileText,
  Boxes,
  Hammer,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export function EstimationDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [labourCount, setLabourCount] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const [estRes, quotRes, matRes, labRes] = await Promise.all([
          apiClient.get<any[]>('/estimation/estimates?limit=5'),
          apiClient.get<any[]>('/estimation/quotations?limit=5'),
          apiClient.get<any[]>('/estimation/materials?limit=1'),
          apiClient.get<any[]>('/estimation/labour'),
        ]);
        setEstimates(Array.isArray(estRes.data) ? estRes.data : []);
        setQuotations(Array.isArray(quotRes.data) ? quotRes.data : []);
        const totalMat = typeof matRes.meta?.total === 'number' ? matRes.meta.total : (Array.isArray(matRes.data) ? matRes.data.length : 0);
        setMaterialsCount(totalMat);
        setLabourCount(Array.isArray(labRes.data) ? labRes.data.length : 0);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    }
    void loadStats();
  }, []);

  if (loading) return <LoadingSpinner label="Loading estimation analytics..." />;

  const pendingApprovals = quotations.filter((q) => q.status === 'PENDING_APPROVAL');
  const approvedQuotations = quotations.filter((q) => q.status === 'APPROVED' || q.status === 'DISPATCHED');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Estimation & Quotations</h1>
            <p className="text-sm text-slate-500">
              Manage BOQs, rates library, client estimates and commercial approval workflows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/estimation/estimates/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Calculator className="h-3.5 w-3.5" />
            Create Estimate
          </Link>
          <Link
            to="/estimation/templates"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
            BOQ Templates
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Active Estimates</span>
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{estimates.length}</span>
            <span className="text-xs text-slate-400">recent</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Approvals</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{pendingApprovals.length}</span>
            <span className="text-xs text-slate-400">require sign-off</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Approved Quotes</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{approvedQuotations.length}</span>
            <span className="text-xs text-slate-400">ready for client</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Rate Catalogue Items</span>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{materialsCount + labourCount}</span>
            <span className="text-xs text-slate-400">materials & labour</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/estimation/estimates"
          className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Estimates</h3>
              <p className="text-xs text-slate-500">Create & edit BOQs</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link
          to="/estimation/quotations"
          className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Quotations</h3>
              <p className="text-xs text-slate-500">Approvals & dispatch</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link
          to="/estimation/materials"
          className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Material Library</h3>
              <p className="text-xs text-slate-500">SKUs & Excel export</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link
          to="/estimation/labour"
          className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <Hammer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Labour Rates</h3>
              <p className="text-xs text-slate-500">Service classifications</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
      </div>

      {/* Recent Estimates & Quotations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Estimates */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Estimates</h2>
            <Link to="/estimation/estimates" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {estimates.map((est) => (
              <Link
                key={est.id}
                to={`/estimation/estimates/${est.id}`}
                className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-md transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{est.estimateNumber}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                      Rev {est.revisionNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{est.title}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">
                    ₹{Number(est.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] uppercase font-semibold text-indigo-600">{est.status}</p>
                </div>
              </Link>
            ))}
            {estimates.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">No estimates created yet.</p>
            )}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Quotations</h2>
            <Link to="/estimation/quotations" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {quotations.map((q) => (
              <Link
                key={q.id}
                to={`/estimation/quotations/${q.id}`}
                className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-md transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{q.quotationNumber}</span>
                    <span className="text-xs text-slate-500">({q.customer?.name || 'Prospect'})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{q.title}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">
                    ₹{Number(q.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <p
                    className={`text-[10px] uppercase font-semibold ${
                      q.status === 'APPROVED'
                        ? 'text-emerald-600'
                        : q.status === 'PENDING_APPROVAL'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {q.status}
                  </p>
                </div>
              </Link>
            ))}
            {quotations.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">No quotations generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
