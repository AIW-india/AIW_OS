import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Phone,
  MessageSquare,
  Mail,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface FollowUpItem {
  id: string;
  type: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  outcome: string | null;
  completedAt: string | null;
  lead?: { id: string; leadNumber: string; customerName: string } | null;
  customer?: { id: string; customerNumber: string; name: string } | null;
  assignedUser?: { name: string } | null;
}

export function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'PENDING') params.append('status', 'PENDING');
      if (filter === 'COMPLETED') params.append('status', 'COMPLETED');
      if (filter === 'OVERDUE') params.append('overdue', 'true');

      const res = await apiClient.get<FollowUpItem[]>(`/crm/follow-ups?${params.toString()}`);
      setFollowUps(res.data || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalId) return;
    try {
      await apiClient.post(`/crm/follow-ups/${completeModalId}/complete`, { outcome });
      setCompleteModalId(null);
      setOutcome('');
      fetchFollowUps();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete follow-up');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this scheduled follow-up?')) return;
    try {
      await apiClient.post(`/crm/follow-ups/${id}/cancel`, {});
      fetchFollowUps();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel follow-up');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Follow-up Schedule</h1>
          <p className="text-sm text-slate-500">Track pending calls, WhatsApp interactions, and client meetings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['ALL', 'PENDING', 'OVERDUE', 'COMPLETED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner label="Loading schedule..." />
          </div>
        ) : followUps.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No follow-ups matching this filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((item) => {
              const isOverdue = item.status === 'PENDING' && new Date(item.scheduledAt) < new Date();
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`rounded-lg p-2.5 ${
                        item.type === 'CALL'
                          ? 'bg-blue-50 text-blue-600'
                          : item.type === 'WHATSAPP'
                          ? 'bg-emerald-50 text-emerald-600'
                          : item.type === 'EMAIL'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {item.type === 'CALL' ? (
                        <Phone className="h-4 w-4" />
                      ) : item.type === 'WHATSAPP' ? (
                        <MessageSquare className="h-4 w-4" />
                      ) : item.type === 'EMAIL' ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {item.lead?.customerName || item.customer?.name || 'Client'}
                        </span>
                        {item.lead && (
                          <Link to={`/crm/leads/${item.lead.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                            ({item.lead.leadNumber})
                          </Link>
                        )}
                        {item.customer && (
                          <Link to={`/crm/customers/${item.customer.id}`} className="font-mono text-xs text-purple-600 hover:underline">
                            ({item.customer.customerNumber})
                          </Link>
                        )}
                        {isOverdue && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Scheduled: <span className="font-medium text-slate-700">{new Date(item.scheduledAt).toLocaleString()}</span> • Assigned: {item.assignedUser?.name || 'Staff'}
                      </p>
                      {item.notes && <p className="mt-1 text-xs text-slate-600">{item.notes}</p>}
                      {item.outcome && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">Outcome: {item.outcome}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center self-end">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => setCompleteModalId(item.id)}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </button>
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-semibold ${
                          item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      {completeModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleComplete} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Record Follow-up Outcome</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Outcome Summary</label>
                <textarea
                  rows={3}
                  required
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Client requested quotation revision, will confirm by Friday..."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteModalId(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
              >
                Save Outcome
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
