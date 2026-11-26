import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export interface AccessDeniedPageProps {
  requiredPermission?: string;
  moduleName?: string;
}

export function AccessDeniedPage({ requiredPermission, moduleName }: AccessDeniedPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md">
        You do not have the necessary permissions to access {moduleName ? `the ${moduleName} module` : 'this resource'}.
      </p>
      {requiredPermission && (
        <div className="mt-3 inline-block rounded-md bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
          Required permission: {requiredPermission}
        </div>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
