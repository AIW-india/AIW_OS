import { useEffect, useState, type FormEvent } from 'react';
import { FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function BoqTemplatesPage() {
  const { hasPermission } = useAuth();
  const canManageTemplates = hasPermission('estimation.templates.manage');

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [projectCategory, setProjectCategory] = useState('RESIDENTIAL_INTERIOR');
  const [description, setDescription] = useState('');

  const loadTemplates = async () => {
    try {
      const res = await apiClient.get<any[]>('/estimation/templates');
      setTemplates(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load BOQ templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/estimation/templates', {
        name,
        projectCategory,
        description: description || undefined,
        templateData: {
          sections: [
            { title: 'Civil & Masonry', items: [] },
            { title: 'Electrical Works', items: [] },
            { title: 'Plumbing & Sanitary', items: [] },
            { title: 'Finishes & Painting', items: [] },
          ],
        },
      });
      setName('');
      setDescription('');
      setShowAddModal(false);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive this template?')) return;
    try {
      await apiClient.delete(`/estimation/templates/${id}`);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to archive template');
    }
  };

  if (loading) return <LoadingSpinner label="Loading BOQ templates..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">BOQ Templates</h1>
            <p className="text-sm text-slate-500">
              Reusable Bill of Quantities packages and work breakdown structures.
            </p>
          </div>
        </div>

        {canManageTemplates && (
          <button
            onClick={() => setShowAddModal(!showAddModal)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}

      {showAddModal && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Create Reusable BOQ Template</h2>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Template Name (e.g. Standard 3BHK Turnkey Interior)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
              <option value="RESIDENTIAL_CONSTRUCTION">Residential Construction</option>
              <option value="COMMERCIAL_INTERIOR">Commercial Interior</option>
              <option value="COMMERCIAL_CONSTRUCTION">Commercial Construction</option>
              <option value="RENOVATION">Renovation & Remodeling</option>
              <option value="TURNKEY">Turnkey Delivery</option>
            </select>
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Save Template
            </button>
          </div>
        </form>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{tmpl.name}</h3>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 mt-1 inline-block">
                  {tmpl.projectCategory.replace(/_/g, ' ')}
                </span>
              </div>
              {canManageTemplates && (
                <button onClick={() => handleDelete(tmpl.id)} className="text-slate-300 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">{tmpl.description || 'Standard sections and line item groupings.'}</p>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No BOQ templates saved. Create standard templates for fast recurring estimation.
          </div>
        )}
      </div>
    </div>
  );
}
