import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, ShieldAlert } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuotationId = searchParams.get('quotationId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectCategory, setProjectCategory] = useState('RESIDENTIAL_INTERIOR');
  const [siteAddress, setSiteAddress] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [sourceQuotationId, setSourceQuotationId] = useState(initialQuotationId);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Dropdown data
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [projectManagers, setProjectManagers] = useState<any[]>([]);

  useEffect(() => {
    async function loadSelectData() {
      try {
        const [cRes, qRes, uRes] = await Promise.all([
          apiClient.get<any[]>('/crm/customers?limit=100'),
          apiClient.get<any[]>('/estimation/quotations?limit=100'),
          apiClient.get<any[]>('/users?limit=100'),
        ]);
        setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
        setQuotations(Array.isArray(qRes.data) ? qRes.data : []);
        setProjectManagers(Array.isArray(uRes.data) ? uRes.data : []);

        if (initialQuotationId && Array.isArray(qRes.data)) {
          const selected = qRes.data.find((q: any) => q.id === initialQuotationId);
          if (selected) {
            setName(selected.title ? `Project — ${selected.title}` : `Project from Quotation ${selected.quotationNumber}`);
            if (selected.customerId) setCustomerId(selected.customerId);
          }
        }
      } catch (err) {
        console.error('Failed to load select data', err);
      }
    }
    void loadSelectData();
  }, [initialQuotationId]);

  const handleQuotationChange = (qId: string) => {
    setSourceQuotationId(qId);
    if (!qId) return;
    const q = quotations.find((item) => item.id === qId);
    if (q) {
      if (!name) setName(`Project — ${q.title || q.quotationNumber}`);
      if (q.customerId) setCustomerId(q.customerId);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post<any>('/projects', {
        name,
        description: description || undefined,
        projectCategory,
        siteAddress: siteAddress || undefined,
        customerId: customerId || undefined,
        projectManagerId: projectManagerId || undefined,
        priority,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate).toISOString() : undefined,
        sourceQuotationId: sourceQuotationId || undefined,
        allowDuplicateFromQuotation: allowDuplicate,
      });

      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create New Project</h1>
            <p className="text-xs text-slate-500">
              Initialize execution scope, schedule, manager assignment, and commercial baseline.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 p-4 border border-rose-200">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-800">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {/* Source Quotation (Commercial Baseline) */}
        <div className="space-y-3 rounded-md bg-indigo-50/50 p-4 border border-indigo-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
            Source Accepted Quotation (Commercial Baseline)
          </label>
          <p className="text-xs text-slate-600">
            Selecting a quotation links the exact accepted commercial revision and freezes the BOQ baseline budget.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <select
                value={sourceQuotationId}
                onChange={(e) => handleQuotationChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="">— Direct Project (No Commercial Quotation Linked) —</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quotationNumber} (Rev {q.revisionNumber}) — {q.title} [₹{Number(q.grandTotal).toLocaleString('en-IN')}]
                  </option>
                ))}
              </select>
            </div>
            {sourceQuotationId && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowDuplicate"
                  checked={allowDuplicate}
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="allowDuplicate" className="text-xs text-slate-700">
                  Allow duplicate project creation from this quotation
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Project Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Project Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sobha Royal Villa Interior Turnkey"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Project Category *</label>
              <select
                value={projectCategory}
                onChange={(e) => setProjectCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
              >
                <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
                <option value="RESIDENTIAL_CONSTRUCTION">Residential Construction</option>
                <option value="COMMERCIAL_INTERIOR">Commercial Interior</option>
                <option value="COMMERCIAL_CONSTRUCTION">Commercial Construction</option>
                <option value="RENOVATION">Renovation & Remodel</option>
                <option value="TURNKEY">Turnkey Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Site Location / Address</label>
              <input
                type="text"
                placeholder="e.g. Plot 142, EPIP Zone, Whitefield, Bengaluru"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Description & Scope Summary</label>
              <textarea
                rows={2}
                placeholder="Key architectural and interior milestones, execution deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Stakeholder & Leadership Assignment */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ownership & Assignment</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Client / Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
              >
                <option value="">— Select Customer (Optional) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Assigned Project Manager</label>
              <select
                value={projectManagerId}
                onChange={(e) => setProjectManagerId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
              >
                <option value="">— Unassigned (Assign Later) —</option>
                {projectManagers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Planned Schedule</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Planned Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Expected Completion Date</label>
              <input
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner label="" /> : <Plus className="h-4 w-4" />}
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
