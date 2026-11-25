import { useEffect, useState } from 'react';
import type { HealthResponseData } from '@aiw/shared-types';
import { RefreshCw, Server, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export function SystemHealthPage() {
  const [health, setHealth] = useState<HealthResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getHealth();
      setHealth(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach API server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">System Health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live connectivity status for the AIW OS API and PostgreSQL database.
          </p>
        </div>
        <button
          onClick={() => void fetchHealth()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Checking API and database connectivity..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <h2 className="text-sm font-semibold text-red-900">API Connection Failed</h2>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : health ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900">API Service</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {health.status.toUpperCase()}
              </span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Service</dt>
                <dd className="font-medium text-slate-900">{health.service}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Version</dt>
                <dd className="font-medium text-slate-900">{health.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Environment</dt>
                <dd className="font-medium text-slate-900">{health.environment}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Uptime</dt>
                <dd className="font-medium text-slate-900">{health.uptime}s</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900">PostgreSQL Database</h2>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  health.database.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {health.database.status.toUpperCase()}
              </span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-900">{health.database.status}</dd>
              </div>
              {health.database.latencyMs !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Latency</dt>
                  <dd className="font-medium text-slate-900">{health.database.latencyMs} ms</dd>
                </div>
              )}
              {health.database.error && (
                <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                  {health.database.error}
                </div>
              )}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
