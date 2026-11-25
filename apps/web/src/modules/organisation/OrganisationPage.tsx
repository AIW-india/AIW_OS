import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Save } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface OrgData {
  id: string;
  name: string;
  legalName: string | null;
  slug: string;
  status: string;
  timezone: string;
  defaultCurrency: string;
}

export function OrganisationPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<OrgData>('/organisations/current')
      .then((res) => {
        setOrg(res.data);
        setName(res.data.name);
        setLegalName(res.data.legalName || '');
        setTimezone(res.data.timezone);
        setDefaultCurrency(res.data.defaultCurrency);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load organisation'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiClient.patch<OrgData>('/organisations/current', {
        name,
        legalName: legalName || null,
        timezone,
        defaultCurrency,
      });
      setOrg(res.data);
      setMessage('Organisation settings updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading organisation..." />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Organisation Settings</h1>
          <p className="text-sm text-slate-500">Manage tenant profile and regional defaults.</p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      {org && (
        <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Slug</label>
              <input
                type="text"
                disabled
                value={org.slug}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Legal Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Status</label>
              <input
                type="text"
                disabled
                value={org.status}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Timezone</label>
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Default Currency</label>
              <input
                type="text"
                required
                maxLength={3}
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
