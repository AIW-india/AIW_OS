import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface SiteVisitItem {
  id: string;
  visitDate: string;
  status: string;
  address: string | null;
  remarks: string | null;
  lead?: { id: string; leadNumber: string; customerName: string } | null;
  customer?: { id: string; customerNumber: string; name: string } | null;
  assignedUser?: { name: string } | null;
}

export function SiteVisitsPage() {
  const [siteVisits, setSiteVisits] = useState<SiteVisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const fetchSiteVisits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<SiteVisitItem[]>('/crm/site-visits');
      setSiteVisits(res.data || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch site visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteVisits();
  }, [fetchSiteVisits]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalId) return;
    try {
      await apiClient.post(`/crm/site-visits/${completeModalId}/complete`, { remarks });
      setCompleteModalId(null);
      setRemarks('');
      fetchSiteVisits();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete visit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Site Visits</h1>
          <p className="text-sm text-slate-500">Scheduled on-site measurements, architectural walkthroughs, and inspections</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner label="Loading visits..." />
          </div>
        ) : siteVisits.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No site visits recorded. Schedule one from any lead details page.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {siteVisits.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 gap-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
                    <Calendar className="h-5 w-5" />
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
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Visit Date: <span className="font-medium text-slate-700">{new Date(item.visitDate).toLocaleString()}</span> • Assigned: {item.assignedUser?.name || 'Staff'}
                    </p>
                    {item.address && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3 w-3 text-slate-400" /> {item.address}
                      </p>
                    )}
                    {item.remarks && (
                      <p className="mt-1 text-xs text-slate-500">Notes: {item.remarks}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center self-end">
                  {item.status === 'SCHEDULED' ? (
                    <button
                      onClick={() => setCompleteModalId(item.id)}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                    </button>
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
            ))}
          </div>
        )}
      </div>

      {completeModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleComplete} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Complete Site Visit</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Site Visit Remarks / Measurement Notes</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Completed carpet area measurement, site photos taken..."
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
                Mark Complete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
