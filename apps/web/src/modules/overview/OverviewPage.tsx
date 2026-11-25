import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Layers } from 'lucide-react';

export function OverviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">AIW OS Foundation</h1>
            <p className="text-sm text-slate-500">
              Engineering baseline for the AIW Enterprise Operations Platform
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          The monorepo, frontend shell, versioned REST API, and database connectivity layer are
          initialized. Business modules (CRM, Estimation, Projects, Procurement, Workforce, Finance)
          will be implemented incrementally in subsequent stages.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/health"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Activity className="h-4 w-4" />
            Check System Health
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
