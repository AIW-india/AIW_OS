import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeft,
  Calendar,
  CheckSquare,
  Users,
  FileText,
  DollarSign,
  Activity,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'milestones' | 'tasks' | 'team' | 'documents' | 'budget' | 'activities'
  >('overview');

  // Sub-resources
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Modals / forms
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestonePhase, setNewMilestonePhase] = useState('Execution');
  const [newMilestoneOrder, setNewMilestoneOrder] = useState(1);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');

  const [showDocModal, setShowDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('DRAWINGS');
  const [newDocUrl, setNewDocUrl] = useState('');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('SITE_ENGINEER');

  const [usersList, setUsersList] = useState<any[]>([]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(`/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMilestones = async () => {
    try {
      const res = await apiClient.get<any[]>(`/projects/milestones/project/${id}`);
      setMilestones(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load milestones', err);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await apiClient.get<any[]>(`/projects/tasks/project/${id}`);
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await apiClient.get<any[]>(`/projects/documents/project/${id}`);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  const loadActivities = async () => {
    try {
      const res = await apiClient.get<any[]>(`/projects/${id}/activities`);
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load activities', err);
    }
  };

  useEffect(() => {
    void loadProject();
    void apiClient.get<any[]>('/users?limit=100').then((res) => {
      setUsersList(Array.isArray(res.data) ? res.data : []);
    });
    void apiClient.get<any[]>('/projects/templates').then((res) => {
      setTemplates(Array.isArray(res.data) ? res.data : []);
    });
  }, [id]);

  useEffect(() => {
    if (activeTab === 'milestones') void loadMilestones();
    if (activeTab === 'tasks') void loadTasks();
    if (activeTab === 'documents') void loadDocuments();
    if (activeTab === 'activities') void loadActivities();
  }, [activeTab, id]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/projects/milestones', {
        projectId: id,
        name: newMilestoneName,
        phaseName: newMilestonePhase,
        sequenceOrder: Number(newMilestoneOrder),
      });
      setShowMilestoneModal(false);
      setNewMilestoneName('');
      await loadMilestones();
      await loadProject();
    } catch (err) {
      console.error('Failed to create milestone', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/projects/tasks', {
        projectId: id,
        milestoneId: newTaskMilestoneId || undefined,
        title: newTaskTitle,
        priority: newTaskPriority,
        assigneeUserId: newTaskAssigneeId || undefined,
      });
      setShowTaskModal(false);
      setNewTaskTitle('');
      await loadTasks();
      await loadProject();
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/projects/documents', {
        projectId: id,
        title: newDocTitle,
        category: newDocCategory,
        fileName: `${newDocTitle.replace(/\s+/g, '_')}.pdf`,
        fileSize: 1024 * 500,
        mimeType: 'application/pdf',
        fileUrl: newDocUrl || 'https://storage.aiw.in/documents/placeholder.pdf',
      });
      setShowDocModal(false);
      setNewDocTitle('');
      setNewDocUrl('');
      await loadDocuments();
    } catch (err) {
      console.error('Failed to create document', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/projects/${id}/members`, {
        userId: newMemberUserId,
        projectRole: newMemberRole,
      });
      setShowMemberModal(false);
      await loadProject();
    } catch (err) {
      console.error('Failed to add member', err);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!confirm('Apply this milestone template to the current project?')) return;
    try {
      await apiClient.post(`/projects/templates/${templateId}/apply/${id}`);
      await loadMilestones();
      await loadProject();
    } catch (err) {
      console.error('Failed to apply template', err);
    }
  };

  if (loading || !project) return <LoadingSpinner label="Loading project details..." />;

  const canManageMilestones = hasPermission('projects.milestones.manage');
  const canCreateTasks = hasPermission('projects.tasks.create');
  const canUploadDocs = hasPermission('projects.documents.upload');
  const canManageTeam = hasPermission('projects.membership.manage');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/projects/list')}
            className="rounded-md border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <span className="font-mono text-xs text-slate-500 rounded bg-slate-100 px-2 py-0.5">
                {project.projectNumber}
              </span>
              <span className="rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold">
                {project.projectCategory.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Customer:{' '}
              <span className="font-medium text-slate-700">{project.customer?.name || 'None'}</span> • Project
              Manager:{' '}
              <span className="font-medium text-slate-700">{project.projectManager?.name || 'Unassigned'}</span>
            </p>
          </div>
        </div>

        {/* Header Badges */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Overall Progress</div>
            <div className="text-lg font-bold text-indigo-600">
              {Number(project.progressPercentage || 0).toFixed(0)}%
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Status</div>
            <span className="text-xs font-bold text-slate-800">{project.status}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'milestones', label: `Milestones (${project.milestones?.length || 0})`, icon: Calendar },
            { id: 'tasks', label: `Tasks (${project._count?.tasks || 0})`, icon: CheckSquare },
            { id: 'team', label: `Project Team (${project.memberships?.length || 0})`, icon: Users },
            { id: 'documents', label: `Documents (${project._count?.documents || 0})`, icon: FileText },
            { id: 'budget', label: 'Commercial Baseline', icon: DollarSign },
            { id: 'activities', label: 'Activity Timeline', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 border-b-2 py-3 font-semibold transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Project Execution Summary</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {project.description || 'No execution description provided.'}
              </p>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                <div>
                  <span className="text-slate-400">Site Location:</span>
                  <div className="font-semibold text-slate-800">{project.siteAddress || 'Not specified'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Execution Priority:</span>
                  <div className="font-semibold text-slate-800">{project.priority}</div>
                </div>
                <div>
                  <span className="text-slate-400">Planned Start Date:</span>
                  <div className="font-semibold text-slate-800">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Expected Handover:</span>
                  <div className="font-semibold text-slate-800">
                    {project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Milestones Preview */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Milestone Roadmap</h2>
                <button
                  onClick={() => setActiveTab('milestones')}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Manage All
                </button>
              </div>
              <div className="space-y-3">
                {project.milestones && project.milestones.length > 0 ? (
                  project.milestones.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{m.sequenceOrder}. {m.name}</span>
                        <span className="ml-2 text-slate-500 font-medium">({m.phaseName})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-indigo-600">
                          {Number(m.progressPercentage || 0).toFixed(0)}%
                        </span>
                        <span className="rounded bg-white px-2 py-0.5 border border-slate-200 text-slate-700">
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">No milestones initialized yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Commercial & Customer Linkage */}
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Commercial Baseline</h2>
              {project.sourceQuotationNumber ? (
                <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-emerald-900">
                    <span>Source Quotation:</span>
                    <span className="font-mono">
                      {project.sourceQuotationNumber} (Rev {project.sourceQuotationRevision})
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-emerald-950 text-sm">
                    <span>Baseline Budget:</span>
                    <span>₹{Number(project.budgetBaselineAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 pt-1">
                    Immutable contract baseline frozen upon project creation.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-100">
                  Direct project execution. No accepted commercial quotation linked.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Client / Customer</h2>
              {project.customer ? (
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-800">{project.customer.name}</div>
                  <div className="text-slate-500">{project.customer.email || 'No email'}</div>
                  <div className="text-slate-500">{project.customer.phone || 'No phone'}</div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No customer linked.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {templates.length > 0 && canManageMilestones && (
                <select
                  onChange={(e) => {
                    if (e.target.value) void handleApplyTemplate(e.target.value);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  defaultValue=""
                >
                  <option value="" disabled>
                    — Apply Milestone Template —
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.projectCategory})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {canManageMilestones && (
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Milestone
              </button>
            )}
          </div>

          {milestones.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg border border-dashed border-slate-300">
              <Calendar className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-xs text-slate-500">No milestones configured yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">#{m.sequenceOrder}</span>
                      <span className="text-sm font-bold text-slate-900">{m.name}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {m.phaseName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Responsible: <span className="font-medium text-slate-800">{m.responsibleUser?.name || 'Unassigned'}</span> • Tasks: {m._count?.tasks || 0}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-indigo-600">{Number(m.progressPercentage || 0).toFixed(0)}%</div>
                      <div className="text-[11px] text-slate-400 font-medium">{m.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Task Board</h2>
            {canCreateTasks && (
              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'].map((colStatus) => {
              const colTasks = tasks.filter((t) => t.status === colStatus);
              return (
                <div key={colStatus} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                    <span>{colStatus.replace(/_/g, ' ')}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-900 shadow-sm border border-slate-200">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-md border border-slate-200 bg-white p-3 shadow-sm text-xs space-y-2 hover:border-indigo-300"
                      >
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        {task.milestone && (
                          <div className="text-[10px] text-indigo-600 font-medium">
                            Milestone: {task.milestone.name}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span>{task.assignee?.name || 'Unassigned'}</span>
                          <span className={`font-semibold ${task.priority === 'URGENT' || task.priority === 'HIGH' ? 'text-rose-600' : 'text-slate-500'}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Team */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Project Staffing & Role Assignments</h2>
            {canManageTeam && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Assign Team Member
              </button>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Project Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {project.memberships?.map((m: any) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{m.user.name}</td>
                    <td className="px-4 py-3">{m.user.email}</td>
                    <td className="px-4 py-3 font-medium text-indigo-700">{m.projectRole.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Project Drawings & Documentation</h2>
            {canUploadDocs && (
              <button
                onClick={() => setShowDocModal(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Upload Document
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {doc.category.replace(/_/g, ' ')}
                  </span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="font-bold text-slate-900 truncate">{doc.title}</div>
                <div className="text-slate-400 text-[11px]">Uploaded by {doc.uploadedBy?.name || 'System'}</div>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="sm:col-span-3 text-center py-12 text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                No documents uploaded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Commercial Budget Baseline */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Approved Commercial & BOQ Baseline</h2>
            <p className="text-xs text-slate-500">
              The project budget is locked to the accepted customer quotation and frozen BOQ specification.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
              <div className="rounded-md bg-slate-50 p-4 border border-slate-200">
                <span className="text-xs text-slate-500">Baseline Contract Value</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  ₹{Number(project.budgetBaselineAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4 border border-slate-200">
                <span className="text-xs text-slate-500">Source Quotation</span>
                <div className="text-sm font-mono font-bold text-indigo-700 mt-1">
                  {project.sourceQuotationNumber || 'Direct'}{' '}
                  {project.sourceQuotationRevision ? `(Rev ${project.sourceQuotationRevision})` : ''}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4 border border-slate-200">
                <span className="text-xs text-slate-500">Currency</span>
                <div className="text-sm font-bold text-slate-900 mt-1">{project.currency}</div>
              </div>
            </div>

            {project.approvedBoqSnapshot?.sections && (
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Frozen BOQ Line Items</h3>
                <div className="space-y-4">
                  {project.approvedBoqSnapshot.sections.map((sec: any, idx: number) => (
                    <div key={idx} className="rounded border border-slate-200 overflow-hidden text-xs">
                      <div className="bg-slate-50 px-3 py-2 font-bold text-slate-800">{sec.title}</div>
                      <table className="min-w-full divide-y divide-slate-100 text-left">
                        <thead className="text-[11px] text-slate-400">
                          <tr>
                            <th className="px-3 py-1.5">Item</th>
                            <th className="px-3 py-1.5">Material Qty/Rate</th>
                            <th className="px-3 py-1.5">Labour Qty/Rate</th>
                            <th className="px-3 py-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {sec.items.map((it: any, iIdx: number) => (
                            <tr key={iIdx}>
                              <td className="px-3 py-2 font-medium">{it.description}</td>
                              <td className="px-3 py-2">
                                {it.materialQty} × ₹{it.materialRate}
                              </td>
                              <td className="px-3 py-2">
                                {it.labourQty} × ₹{it.labourRate}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                ₹{Number(it.itemTotal).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Activities */}
      {activeTab === 'activities' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Project Audit & Execution Timeline</h2>
          <div className="space-y-4 border-l-2 border-slate-200 pl-4 text-xs">
            {activities.map((act) => (
              <div key={act.id} className="relative space-y-1">
                <div className="font-semibold text-slate-900">{act.description}</div>
                <div className="text-[11px] text-slate-400">
                  {act.actor?.name || 'System'} • {new Date(act.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {activities.length === 0 && <div className="text-slate-400 py-4">No logged activity yet.</div>}
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Add Project Milestone</h3>
            <form onSubmit={handleCreateMilestone} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">Milestone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substructure & Foundation Pouring"
                  value={newMilestoneName}
                  onChange={(e) => setNewMilestoneName(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Phase Name</label>
                <input
                  type="text"
                  required
                  value={newMilestonePhase}
                  onChange={(e) => setNewMilestonePhase(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Sequence Order</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newMilestoneOrder}
                  onChange={(e) => setNewMilestoneOrder(parseInt(e.target.value, 10))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="rounded border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded bg-indigo-600 px-4 py-1.5 font-bold text-white">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Add Project Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Procure structural steel rebar grade Fe500"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Milestone</label>
                <select
                  value={newTaskMilestoneId}
                  onChange={(e) => setNewTaskMilestoneId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="">— Unlinked / Standalone Task —</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.sequenceOrder} {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Assignee</label>
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="">— Unassigned —</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded bg-indigo-600 px-4 py-1.5 font-bold text-white">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Upload Project Document</h3>
            <form onSubmit={handleCreateDocument} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Conduit Layout Plan Rev 2"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Category *</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="DRAWINGS">Drawings</option>
                  <option value="CLIENT_APPROVALS">Client Approvals</option>
                  <option value="CONTRACTS">Contracts</option>
                  <option value="SITE_PHOTOGRAPHS">Site Photographs</option>
                  <option value="TECHNICAL_SPECS">Technical Specifications</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">File Storage URL</label>
                <input
                  type="text"
                  placeholder="https://storage.aiw.in/documents/..."
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="rounded border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded bg-indigo-600 px-4 py-1.5 font-bold text-white">
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Assign Team Member</h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">Employee / User *</label>
                <select
                  required
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="">— Select User —</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Project Role *</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="SITE_ENGINEER">Site Engineer</option>
                  <option value="ARCHITECT_DESIGNER">Architect / Designer</option>
                  <option value="QA_QC">Quality & QC Inspector</option>
                  <option value="CONSULTANT">Consultant</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="rounded border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded bg-indigo-600 px-4 py-1.5 font-bold text-white">
                  Assign Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
