import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UserCheck,
  Archive,
  UserPlus,
  RefreshCw,
  XCircle,
  Plus,
  Edit2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { usePermission, PermissionGate } from '@/lib/auth/usePermission';

interface LeadDetails {
  id: string;
  leadNumber: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  propertyType: string | null;
  projectCategory: string | null;
  requirements: string | null;
  estimatedBudget: number | null;
  expectedStartDate: string | null;
  priority: string;
  status: string;
  pipelineStageId: string | null;
  lostRemarks: string | null;
  createdAt: string;
  source?: { id: string; name: string } | null;
  assignedUser?: { id: string; name: string } | null;
  pipelineStage?: { id: string; name: string; color: string | null } | null;
  lostReason?: { id: string; name: string } | null;
  customer?: { id: string; customerNumber: string; name: string } | null;
  stageHistory?: Array<{
    id: string;
    fromStage?: { name: string } | null;
    toStage: { name: string };
    remarks: string | null;
    occurredAt: string;
  }>;
  followUps?: Array<{
    id: string;
    type: string;
    scheduledAt: string;
    status: string;
    notes: string | null;
    assignedUser?: { name: string } | null;
  }>;
  siteVisits?: Array<{
    id: string;
    visitDate: string;
    status: string;
    remarks: string | null;
    assignedUser?: { name: string } | null;
  }>;
}

interface Activity {
  id: string;
  activityType: string;
  description: string;
  occurredAt: string;
  actor?: { name: string } | null;
}

interface PipelineStage {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

export function LeadDetailsPage() {
  const canUpdateLead = usePermission('crm.leads.update');
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Action States
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');

  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [fType, setFType] = useState('CALL');
  const [fDate, setFDate] = useState('');
  const [fNotes, setFNotes] = useState('');

  const [siteVisitModalOpen, setSiteVisitModalOpen] = useState(false);
  const [vDate, setVDate] = useState('');
  const [vAddress, setVAddress] = useState('');
  const [vRemarks, setVRemarks] = useState('');

  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostRemarks, setLostRemarks] = useState('');

  // Edit Lead Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  // Complete FollowUp & SiteVisit State
  const [completeFollowUpId, setCompleteFollowUpId] = useState<string | null>(null);
  const [followUpOutcome, setFollowUpOutcome] = useState('');
  const [completeSiteVisitId, setCompleteSiteVisitId] = useState<string | null>(null);
  const [siteVisitRemarksUpdate, setSiteVisitRemarksUpdate] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPropertyType, setEditPropertyType] = useState('');
  const [editProjectCategory, setEditProjectCategory] = useState('');
  const [editEstimatedBudget, setEditEstimatedBudget] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editRequirements, setEditRequirements] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchLeadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [leadRes, actRes, stagesRes, usersRes] = await Promise.all([
        apiClient.get<LeadDetails>(`/crm/leads/${id}`),
        apiClient.get<Activity[]>(`/crm/leads/${id}/activities`),
        apiClient.get<PipelineStage[]>('/crm/pipeline-stages').catch(() => ({ data: [] })),
        apiClient.get<User[]>('/users').catch(() => ({ data: [] })),
      ]);
      setLead(leadRes.data);
      setActivities(actRes.data || []);
      setStages(stagesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  const openEditModal = () => {
    if (!lead) return;
    setEditName(lead.customerName || '');
    setEditPhone(lead.phone || '');
    setEditEmail(lead.email || '');
    setEditLocation(lead.location || '');
    setEditPropertyType(lead.propertyType || '');
    setEditProjectCategory(lead.projectCategory || '');
    setEditEstimatedBudget(lead.estimatedBudget ? String(lead.estimatedBudget) : '');
    setEditPriority(lead.priority || 'MEDIUM');
    setEditRequirements(lead.requirements || '');
    setEditModalOpen(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName.trim()) return;
    try {
      setEditSaving(true);
      await apiClient.patch(`/crm/leads/${id}`, {
        customerName: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        location: editLocation.trim() || null,
        propertyType: editPropertyType || null,
        projectCategory: editProjectCategory || null,
        estimatedBudget: editEstimatedBudget ? Number(editEstimatedBudget) : null,
        priority: editPriority,
        requirements: editRequirements.trim() || null,
      });
      setEditModalOpen(false);
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setEditSaving(false);
    }
  };

  const handlePriorityQuickChange = async (newPriority: string) => {
    if (!id || !lead) return;
    try {
      await apiClient.patch(`/crm/leads/${id}`, { priority: newPriority });
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to change priority');
    }
  };

  const handleStageChange = async (newStageId: string) => {
    if (!lead || !id) return;
    try {
      await apiClient.post(`/crm/leads/${id}/stage`, { pipelineStageId: newStageId });
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedAssignee) return;
    try {
      await apiClient.post(`/crm/leads/${id}/assign`, {
        assignedUserId: selectedAssignee,
        remarks: assignRemarks || undefined,
      });
      setAssignModalOpen(false);
      setAssignRemarks('');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to assign lead');
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fDate) return;
    try {
      await apiClient.post('/crm/follow-ups', {
        leadId: id,
        type: fType,
        scheduledAt: fDate,
        notes: fNotes || undefined,
      });
      setFollowUpModalOpen(false);
      setFNotes('');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to schedule follow-up');
    }
  };

  const handleCompleteFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeFollowUpId) return;
    try {
      await apiClient.post(`/crm/follow-ups/${completeFollowUpId}/complete`, {
        outcome: followUpOutcome || undefined,
      });
      setCompleteFollowUpId(null);
      setFollowUpOutcome('');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete follow-up');
    }
  };

  const handleCancelFollowUp = async (followUpId: string) => {
    if (!window.confirm('Cancel this scheduled follow-up?')) return;
    try {
      await apiClient.post(`/crm/follow-ups/${followUpId}/cancel`, {});
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel follow-up');
    }
  };

  const handleCompleteSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeSiteVisitId) return;
    try {
      await apiClient.post(`/crm/site-visits/${completeSiteVisitId}/complete`, {
        remarks: siteVisitRemarksUpdate || undefined,
      });
      setCompleteSiteVisitId(null);
      setSiteVisitRemarksUpdate('');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete site visit');
    }
  };

  const handleCancelSiteVisit = async (siteVisitId: string) => {
    if (!window.confirm('Cancel this scheduled site visit?')) return;
    try {
      await apiClient.post(`/crm/site-visits/${siteVisitId}/cancel`, {});
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel site visit');
    }
  };

  const handleCreateSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !vDate) return;
    try {
      await apiClient.post('/crm/site-visits', {
        leadId: id,
        visitDate: vDate,
        address: vAddress || undefined,
        remarks: vRemarks || undefined,
      });
      setSiteVisitModalOpen(false);
      setVAddress('');
      setVRemarks('');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to schedule site visit');
    }
  };

  const handleConvertLead = async () => {
    if (!id || !window.confirm('Convert this lead to a Won customer? This will create a permanent Customer account.')) return;
    try {
      await apiClient.post<{ customer: { id: string } }>(`/crm/leads/${id}/convert`, {});
      alert('Lead successfully converted to Customer!');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to convert lead');
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiClient.post(`/crm/leads/${id}/lost`, {
        lostRemarks: lostRemarks || undefined,
      });
      setLostModalOpen(false);
      setLostRemarks('');
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark as lost');
    }
  };

  const handleArchive = async () => {
    if (!id || !window.confirm('Are you sure you want to archive this lead?')) return;
    try {
      await apiClient.post(`/crm/leads/${id}/archive`, {});
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to archive lead');
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/crm/leads/${id}/restore`, {});
      fetchLeadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to restore lead');
    }
  };

  if (loading) return <LoadingSpinner label="Loading lead workspace..." />;

  if (error || !lead) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">Lead Not Found</p>
        <p className="mt-1 text-sm">{error || 'The requested lead does not exist or has been removed.'}</p>
        <Link to="/crm/leads" className="mt-4 inline-block text-xs font-semibold text-blue-600 underline">
          Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/crm/leads" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-500">{lead.leadNumber}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  lead.status === 'WON'
                    ? 'bg-emerald-100 text-emerald-800'
                    : lead.status === 'LOST'
                    ? 'bg-rose-100 text-rose-800'
                    : lead.status === 'ARCHIVED'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {lead.status}
              </span>
              {canUpdateLead ? (
                <select
                  value={lead.priority}
                  onChange={(e) => handlePriorityQuickChange(e.target.value)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    lead.priority === 'URGENT'
                      ? 'bg-red-100 text-red-800'
                      : lead.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-800'
                      : lead.priority === 'MEDIUM'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                  title="Click to change lead priority"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    lead.priority === 'URGENT'
                      ? 'bg-red-100 text-red-800'
                      : lead.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-800'
                      : lead.priority === 'MEDIUM'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {lead.priority}
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{lead.customerName}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {lead.status === 'OPEN' && (
            <>
              <PermissionGate permission="crm.leads.update">
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Lead
                </button>
              </PermissionGate>
              <PermissionGate permission="crm.leads.convert">
                <button
                  onClick={handleConvertLead}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Convert to Customer
                </button>
              </PermissionGate>
              <PermissionGate permission="crm.leads.assign">
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Reassign
                </button>
              </PermissionGate>
              <PermissionGate permission="crm.leads.update">
                <button
                  onClick={() => setLostModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <XCircle className="h-3.5 w-3.5" /> Mark Lost
                </button>
              </PermissionGate>
              <PermissionGate permission="crm.leads.delete">
                <button
                  onClick={handleArchive}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </PermissionGate>
            </>
          )}
          {lead.status === 'ARCHIVED' && (
            <PermissionGate permission="crm.leads.delete">
              <button
                onClick={handleRestore}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Restore Lead
              </button>
            </PermissionGate>
          )}
          {lead.customer && (
            <Link
              to={`/crm/customers/${lead.customer.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              <UserCheck className="h-3.5 w-3.5" /> View Customer ({lead.customer.customerNumber})
            </Link>
          )}
        </div>
      </div>

      {/* Stage Selector Bar */}
      {lead.status === 'OPEN' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Pipeline Stage
          </span>
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => {
              const isCurrent = lead.pipelineStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Details + Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Action Tabs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Lead Summary</h2>
              {lead.status === 'OPEN' && (
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Information
                </button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="block text-xs font-medium text-slate-400">Phone</span>
                <span className="font-semibold text-slate-800">{lead.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Email</span>
                <span className="font-semibold text-slate-800">{lead.email || 'Not provided'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Location</span>
                <span className="font-semibold text-slate-800">{lead.location || 'Not provided'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Lead Source</span>
                <span className="font-semibold text-slate-800">{lead.source?.name || 'Direct / Organic'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Property Type</span>
                <span className="font-semibold text-slate-800">{lead.propertyType || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Project Category</span>
                <span className="font-semibold text-slate-800">{lead.projectCategory || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Estimated Budget</span>
                <span className="font-semibold text-emerald-700">
                  {lead.estimatedBudget ? `₹${Number(lead.estimatedBudget).toLocaleString('en-IN')}` : 'Undisclosed'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Assigned Employee</span>
                <span className="font-semibold text-slate-800">{lead.assignedUser?.name || 'Unassigned'}</span>
              </div>
              {lead.requirements && (
                <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <span className="block text-xs font-semibold text-slate-500 uppercase">Requirements Note</span>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">{lead.requirements}</p>
                </div>
              )}
              {lead.lostRemarks && (
                <div className="sm:col-span-2 rounded-lg bg-rose-50 p-3 border border-rose-200">
                  <span className="block text-xs font-semibold text-rose-700 uppercase">Lost Reason Remarks</span>
                  <p className="mt-1 text-rose-800">{lead.lostRemarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Follow-ups Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Scheduled Follow-ups</h2>
              <button
                onClick={() => setFollowUpModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-3.5 w-3.5" /> Schedule Follow-up
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {lead.followUps && lead.followUps.length > 0 ? (
                lead.followUps.map((f) => (
                  <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs gap-3">
                    <div className="flex items-start gap-3">
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800">{f.type}</span>
                      <div>
                        <span className="font-medium text-slate-800">{new Date(f.scheduledAt).toLocaleString()}</span>
                        {f.notes && <p className="text-slate-500 mt-0.5">{f.notes}</p>}
                        {f.assignedUser && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Assigned: {f.assignedUser.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {f.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => {
                              setCompleteFollowUpId(f.id);
                              setFollowUpOutcome('');
                            }}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                          </button>
                          <button
                            onClick={() => handleCancelFollowUp(f.id)}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span
                          className={`rounded px-2 py-0.5 font-semibold ${
                            f.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {f.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No follow-ups recorded.</p>
              )}
            </div>
          </div>

          {/* Site Visits Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Site Visits</h2>
              <button
                onClick={() => setSiteVisitModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-3.5 w-3.5" /> Schedule Site Visit
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {lead.siteVisits && lead.siteVisits.length > 0 ? (
                lead.siteVisits.map((v) => (
                  <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs gap-3">
                    <div>
                      <span className="font-bold text-slate-800">{new Date(v.visitDate).toLocaleDateString()}</span>
                      {v.remarks && <p className="text-slate-500 mt-0.5">{v.remarks}</p>}
                      {v.assignedUser && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Assigned: {v.assignedUser.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {v.status === 'SCHEDULED' ? (
                        <>
                          <button
                            onClick={() => {
                              setCompleteSiteVisitId(v.id);
                              setSiteVisitRemarksUpdate('');
                            }}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                          </button>
                          <button
                            onClick={() => handleCancelSiteVisit(v.id)}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span
                          className={`rounded px-2 py-0.5 font-semibold ${
                            v.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {v.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No site visits scheduled.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Activity Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Activity Timeline
          </h2>
          <div className="mt-4 flow-root">
            <ul className="-mb-8">
              {activities.map((act, idx) => (
                <li key={act.id}>
                  <div className="relative pb-8">
                    {idx !== activities.length - 1 && (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white text-blue-600 text-xs font-bold">
                          {act.activityType.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{act.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            By {act.actor?.name || 'System'}
                          </p>
                        </div>
                        <div className="text-right text-[10px] whitespace-nowrap text-slate-400">
                          {new Date(act.occurredAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {activities.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No logged activity yet.</p>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Lead Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleUpdateLead} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Lead & Customer Information</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Location / Address</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Property Type</label>
                  <select
                    value={editPropertyType}
                    onChange={(e) => setEditPropertyType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Property Type</option>
                    <option value="RESIDENTIAL_APARTMENT">Residential Apartment</option>
                    <option value="RESIDENTIAL_VILLA">Residential Villa / House</option>
                    <option value="COMMERCIAL_OFFICE">Commercial Office</option>
                    <option value="RETAIL_STORE">Retail / Showroom</option>
                    <option value="HOSPITALITY">Hospitality / Restaurant</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Project Category</label>
                  <select
                    value={editProjectCategory}
                    onChange={(e) => setEditProjectCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    <option value="INTERIOR_DESIGN">Full Interior Design</option>
                    <option value="CIVIL_CONSTRUCTION">Civil Construction</option>
                    <option value="RENOVATION">Renovation & Remodeling</option>
                    <option value="MODULAR_KITCHEN">Modular Kitchen & Wardrobes</option>
                    <option value="COMMERCIAL_FITOUT">Commercial Fitout</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Estimated Budget (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editEstimatedBudget}
                    onChange={(e) => setEditEstimatedBudget(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Lead Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Detailed Scope / Requirements</label>
                  <textarea
                    rows={3}
                    value={editRequirements}
                    onChange={(e) => setEditRequirements(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Follow-up Modal */}
      {completeFollowUpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleCompleteFollowUp} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Mark Follow-up as Completed</h3>
            <p className="mt-1 text-xs text-slate-500">Record client discussion outcome and update the contact history.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Discussion Outcome / Result</label>
                <textarea
                  rows={3}
                  required
                  value={followUpOutcome}
                  onChange={(e) => setFollowUpOutcome(e.target.value)}
                  placeholder="e.g. Client requested revised quote; scheduled site inspection for next week..."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteFollowUpId(null)}
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

      {/* Complete Site Visit Modal */}
      {completeSiteVisitId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleCompleteSiteVisit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Mark Site Visit as Completed</h3>
            <p className="mt-1 text-xs text-slate-500">Record measurement observations, site notes, or client requirements.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Site Visit Remarks / Notes</label>
                <textarea
                  rows={3}
                  value={siteVisitRemarksUpdate}
                  onChange={(e) => setSiteVisitRemarksUpdate(e.target.value)}
                  placeholder="e.g. Measurements verified; plumbing & electrical points noted; client requested Italian marble flooring..."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteSiteVisitId(null)}
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

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleAssign} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Assign / Reassign Lead</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Select Employee</label>
                <select
                  required
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Choose an employee</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Remarks / Instructions</label>
                <textarea
                  rows={2}
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="Reason for reassignment or notes..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Follow-up Modal */}
      {followUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleCreateFollowUp} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Schedule Follow-up</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Contact Channel</label>
                <select
                  value={fType}
                  onChange={(e) => setFType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">In-person Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Agenda / Notes</label>
                <textarea
                  rows={2}
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Discussion points or reminder note..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Site Visit Modal */}
      {siteVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleCreateSiteVisit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Schedule Site Visit</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Visit Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={vDate}
                  onChange={(e) => setVDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Site Address</label>
                <input
                  type="text"
                  value={vAddress}
                  onChange={(e) => setVAddress(e.target.value)}
                  placeholder="Property location details..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Remarks</label>
                <textarea
                  rows={2}
                  value={vRemarks}
                  onChange={(e) => setVRemarks(e.target.value)}
                  placeholder="Measurement equipment needed, client availability notes..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSiteVisitModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Schedule Visit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Lost Modal */}
      {lostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleMarkLost} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-rose-900">Mark Lead as Lost</h3>
            <p className="mt-1 text-xs text-slate-500">
              Record the client feedback or reason why this lead did not convert.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Reason / Feedback</label>
                <textarea
                  required
                  rows={3}
                  value={lostRemarks}
                  onChange={(e) => setLostRemarks(e.target.value)}
                  placeholder="e.g. Budget mismatch, client chose competitor, postponed project..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLostModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-700"
              >
                Confirm Lost
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
