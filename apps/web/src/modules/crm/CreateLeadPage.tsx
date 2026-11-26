import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface User {
  id: string;
  name: string;
  email: string;
}

interface LeadSource {
  id: string;
  name: string;
  code: string;
}

interface PipelineStage {
  id: string;
  name: string;
  code: string;
}

export function CreateLeadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('RESIDENTIAL');
  const [projectCategory, setProjectCategory] = useState('INTERIOR_DESIGN');
  const [requirements, setRequirements] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [sourceId, setSourceId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [pipelineStageId, setPipelineStageId] = useState('');

  // Dropdown options
  const [users, setUsers] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);

  useEffect(() => {
    async function fetchFormOptions() {
      try {
        setInitLoading(true);
        const [usersRes, sourcesRes, stagesRes] = await Promise.all([
          apiClient.get<User[]>('/users').catch(() => ({ data: [] })),
          apiClient.get<LeadSource[]>('/crm/lead-sources').catch(() => ({ data: [] })),
          apiClient.get<PipelineStage[]>('/crm/pipeline-stages').catch(() => ({ data: [] })),
        ]);
        setUsers(usersRes.data || []);
        setSources(sourcesRes.data || []);
        if (stagesRes.data && stagesRes.data.length > 0) {
          setPipelineStageId(stagesRes.data[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load options');
      } finally {
        setInitLoading(false);
      }
    }
    fetchFormOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        propertyType: propertyType || undefined,
        projectCategory: projectCategory || undefined,
        requirements: requirements.trim() || undefined,
        estimatedBudget: estimatedBudget ? Number(estimatedBudget) : undefined,
        expectedStartDate: expectedStartDate || undefined,
        priority,
        sourceId: sourceId || undefined,
        assignedUserId: assignedUserId || undefined,
        pipelineStageId: pipelineStageId || undefined,
      };

      const res = await apiClient.post<{ id: string }>('/crm/leads', payload);
      navigate(`/crm/leads/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <LoadingSpinner label="Preparing lead form..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/crm/leads" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Lead Enquiry</h1>
          <p className="text-sm text-slate-500">Capture client requirements, budget, and assignment</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Customer Information */}
        <div className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-semibold text-slate-900">Customer Details</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700">Location / City</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. HSR Layout, Bengaluru"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Project Scope & Requirements */}
        <div className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-semibold text-slate-900">Project Requirements</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="RESIDENTIAL_APARTMENT">Residential Apartment</option>
                <option value="RESIDENTIAL_VILLA">Residential Villa / House</option>
                <option value="COMMERCIAL_OFFICE">Commercial Office</option>
                <option value="RETAIL_STORE">Retail / Showroom</option>
                <option value="HOSPITALITY">Hospitality / Restaurant</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Project Category</label>
              <select
                value={projectCategory}
                onChange={(e) => setProjectCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="INTERIOR_DESIGN">Full Interior Design</option>
                <option value="CIVIL_CONSTRUCTION">Civil Construction</option>
                <option value="RENOVATION">Renovation & Remodeling</option>
                <option value="MODULAR_KITCHEN">Modular Kitchen & Wardrobes</option>
                <option value="COMMERCIAL_FITOUT">Commercial Fitout</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Estimated Budget (₹)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="e.g. 1500000"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Expected Start Date</label>
              <input
                type="date"
                value={expectedStartDate}
                onChange={(e) => setExpectedStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700">Detailed Scope / Requirements</label>
              <textarea
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Mention 3BHK, modular kitchen, false ceiling, wood work details..."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Lead Workflow & Assignment */}
        <div>
          <h2 className="text-base font-semibold text-slate-900">Workflow & Assignment</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Lead Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Lead Source</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select source</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Assign To Employee</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
          <Link
            to="/crm/leads"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
