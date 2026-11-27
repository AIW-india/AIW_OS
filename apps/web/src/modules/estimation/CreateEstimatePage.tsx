import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, ArrowLeft, Plus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';

export function CreateEstimatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialLeadId = searchParams.get('leadId') || '';
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [projectCategory, setProjectCategory] = useState('RESIDENTIAL_INTERIOR');
  const [projectLocation, setProjectLocation] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState(initialLeadId);
  const [customerId, setCustomerId] = useState(initialCustomerId);

  // Markups
  const [wastagePercent, setWastagePercent] = useState(5);
  const [overheadPercent, setOverheadPercent] = useState(10);
  const [profitMarginPercent, setProfitMarginPercent] = useState(15);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(18);

  // Clients & Leads for Dropdowns
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    async function loadSelects() {
      try {
        const [leadsRes, custRes] = await Promise.all([
          apiClient.get<any[]>('/crm/leads?limit=50'),
          apiClient.get<any[]>('/crm/customers?limit=50'),
        ]);
        setLeads(leadsRes.data);
        setCustomers(custRes.data);
      } catch (e) {
        console.error('Failed to load leads/customers', e);
      }
    }
    void loadSelects();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create initial estimate with a sample section
      const res = await apiClient.post<any>('/estimation/estimates', {
        title,
        projectCategory,
        projectLocation: projectLocation || undefined,
        description: description || undefined,
        leadId: leadId || undefined,
        customerId: customerId || undefined,
        wastagePercent: Number(wastagePercent),
        overheadPercent: Number(overheadPercent),
        profitMarginPercent: Number(profitMarginPercent),
        discountPercent: Number(discountPercent),
        taxPercent: Number(taxPercent),
        sections: [
          {
            title: 'Initial Scope / Preliminary Works',
            description: 'Site setup, mobilization, and preliminary specifications',
            orderIndex: 0,
            items: [],
          },
        ],
      });

      navigate(`/estimation/estimates/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create estimate');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate('/estimation/estimates')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Estimates
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <Calculator className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create New Project Estimate</h1>
          <p className="text-sm text-slate-500">
            Define project scope, category, client linkage, and pricing markups.
          </p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {/* Project Basic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Project Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Estimate Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. 3BHK Turnkey Interior Execution — Villa 42"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                <option value="RENOVATION">Renovation & Remodeling</option>
                <option value="TURNKEY">Turnkey Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Site Location / Address</label>
              <input
                type="text"
                placeholder="e.g. Whitefield, Bengaluru"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Project Description & Scope</label>
              <textarea
                rows={2}
                placeholder="Brief description of the estimate scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Client / CRM Linkage */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Client / CRM Integration</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Link Existing Customer</label>
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
              <label className="block text-xs font-semibold text-slate-700">Or Link Qualified CRM Lead</label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
              >
                <option value="">— Select Lead (Optional) —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.customerName} ({l.leadNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Markup Defaults */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Standard Pricing Markups (%)</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Wastage %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={wastagePercent}
                onChange={(e) => setWastagePercent(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Overhead %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={overheadPercent}
                onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Profit Margin %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={profitMarginPercent}
                onChange={(e) => setProfitMarginPercent(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Discount %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">GST / Tax %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => navigate('/estimation/estimates')}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Initializing BOQ...' : 'Proceed to BOQ Builder'}
          </button>
        </div>
      </form>
    </div>
  );
}
