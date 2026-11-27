import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { Layers, Plus, Trash2 } from 'lucide-react';

interface MilestoneTemplateItem {
  id: string;
  name: string;
  description?: string;
  projectCategory: string;
  phases: Array<{
    name: string;
    description?: string;
    estimatedDays?: number;
    tasks?: string[];
  }>;
  createdAt: string;
}

export function MilestoneTemplatesPage() {
  const [templates, setTemplates] = useState<MilestoneTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectCategory, setProjectCategory] = useState('RESIDENTIAL_INTERIOR');
  const [phases, setPhases] = useState<Array<{ name: string; description: string; estimatedDays: number; tasks: string }>>([
    { name: 'Design & Engineering Sign-off', description: '2D/3D layouts and MEP clearance', estimatedDays: 7, tasks: 'Client drawings approval, Material schedule signoff' },
    { name: 'Civil & Structural Works', description: 'Demolition, masonry, plastering', estimatedDays: 14, tasks: 'Demolition, Wall construction, Plastering' },
    { name: 'Electrical & Plumbing Rough-in', description: 'Concealed conduits, piping', estimatedDays: 10, tasks: 'Conduit laying, Pressure testing, Cable pulling' },
    { name: 'Finishing & Joinery', description: 'Carpentry, painting, tiles', estimatedDays: 20, tasks: 'Tile fixing, Modular joinery installation, Painting' },
    { name: 'Handover & Snagging', description: 'Final snag clearance and client signoff', estimatedDays: 5, tasks: 'Deep cleaning, Snag list verification, Handover' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<MilestoneTemplateItem[]>('/projects/milestone-templates');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch milestone templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddPhase = () => {
    setPhases([...phases, { name: '', description: '', estimatedDays: 7, tasks: '' }]);
  };

  const handleRemovePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const handlePhaseChange = (index: number, field: string, value: any) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    setPhases(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const formattedPhases = phases.map(p => ({
        name: p.name,
        description: p.description,
        estimatedDays: Number(p.estimatedDays) || 0,
        tasks: p.tasks.split(',').map(t => t.trim()).filter(Boolean)
      }));

      await apiClient.post('/projects/milestone-templates', {
        name,
        description,
        projectCategory,
        phases: formattedPhases
      });

      setShowModal(false);
      setName('');
      setDescription('');
      fetchTemplates();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Project Milestone Templates</h1>
          <p className="text-sm text-slate-500">
            Standardize milestone phases and default tasks across project categories for repeatable execution.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <LoadingSpinner label="Loading templates..." />
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <Layers className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No milestone templates yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Create standard execution templates to automatically populate project phases, dependencies, and milestones during project setup.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                    {tpl.projectCategory}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{tpl.name}</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                  {Array.isArray(tpl.phases) ? tpl.phases.length : 0} Phases
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                {tpl.description || 'No description provided.'}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phase Sequence:</span>
                <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
                  {Array.isArray(tpl.phases) && tpl.phases.map((p, idx) => (
                    <li key={idx} className="truncate">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      {p.estimatedDays ? <span className="text-slate-400"> ({p.estimatedDays}d)</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Create Milestone Template</h2>
            <p className="text-xs text-slate-500 mt-1">
              Templates define default sequential phases that can be loaded into any new or existing project.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Template Name *</label>
                <input
                  required
                  placeholder="e.g. Standard 3BHK Turnkey Interior Execution"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Project Category *</label>
                  <select
                    value={projectCategory}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setProjectCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs bg-white"
                  >
                    <option value="RESIDENTIAL_CONSTRUCTION">Residential Construction</option>
                    <option value="COMMERCIAL_CONSTRUCTION">Commercial Construction</option>
                    <option value="RESIDENTIAL_INTERIOR">Residential Interior</option>
                    <option value="COMMERCIAL_INTERIOR">Commercial Interior</option>
                    <option value="RENOVATION">Renovation</option>
                    <option value="TURNKEY">Turnkey</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Description</label>
                  <input
                    placeholder="Brief description of the execution scope..."
                    value={description}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Execution Phases</label>
                  <button
                    type="button"
                    onClick={handleAddPhase}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="h-3 w-3" /> Add Phase
                  </button>
                </div>

                <div className="space-y-3">
                  {phases.map((ph, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <input
                          required
                          placeholder="Phase name (e.g. Civil Works)"
                          value={ph.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePhaseChange(idx, 'name', e.target.value)}
                          className="flex-1 rounded-md border border-slate-300 p-1.5 text-xs bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Est Days"
                          value={ph.estimatedDays}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePhaseChange(idx, 'estimatedDays', e.target.value)}
                          className="w-24 rounded-md border border-slate-300 p-1.5 text-xs bg-white"
                        />
                        {phases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhase(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          placeholder="Phase description"
                          value={ph.description}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePhaseChange(idx, 'description', e.target.value)}
                          className="rounded-md border border-slate-300 p-1.5 text-xs bg-white"
                        />
                        <input
                          placeholder="Default tasks (comma separated)"
                          value={ph.tasks}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePhaseChange(idx, 'tasks', e.target.value)}
                          className="rounded-md border border-slate-300 p-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
