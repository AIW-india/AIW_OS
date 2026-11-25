import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  occurredAt: string;
  requestId: string | null;
  actor: { id: string; name: string; email: string } | null;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AuditLogEntry[]>('/audit-logs?limit=100');
      setLogs(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  if (loading) return <LoadingSpinner label="Loading audit logs..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
            <p className="text-sm text-slate-500">
              Immutable security and administrative event trail for this organisation.
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {new Date(log.occurredAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {log.actor ? `${log.actor.name} (${log.actor.email})` : 'System'}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {log.resourceType}
                  {log.resourceId ? ` • ${log.resourceId.slice(0, 8)}...` : ''}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No audit events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
