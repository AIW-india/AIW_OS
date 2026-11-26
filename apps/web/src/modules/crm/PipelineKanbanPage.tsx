import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Phone,
  User,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

interface PipelineStage {
  id: string;
  name: string;
  code: string;
  order: number;
  color: string | null;
  isTerminal: boolean;
}

interface LeadCard {
  id: string;
  leadNumber: string;
  customerName: string;
  phone: string | null;
  pipelineStageId: string | null;
  priority: string;
  status: string;
  estimatedBudget: number | null;
  assignedUser?: { name: string } | null;
}

export function PipelineKanbanPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [stagesRes, leadsRes] = await Promise.all([
        apiClient.get<PipelineStage[]>('/crm/pipeline-stages'),
        apiClient.get<LeadCard[]>('/crm/leads?limit=100&status=OPEN'),
      ]);
      setStages(stagesRes.data || []);
      setLeads(leadsRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMoveStage = async (leadId: string, toStageId: string) => {
    try {
      await apiClient.post(`/crm/leads/${leadId}/stage`, { pipelineStageId: toStageId });
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipelineStageId: toStageId } : l)),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to move lead stage');
      fetchData();
    }
  };

  if (loading) return <LoadingSpinner label="Loading pipeline board..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Pipeline Kanban</h1>
          <p className="text-sm text-slate-500">Visual sales process tracking and stage movement</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/crm/leads/create"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Create Lead
          </Link>
          <Link
            to="/crm/leads"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            List View
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {stages.map((stage) => {
          const columnLeads = leads.filter((l) => l.pipelineStageId === stage.id);
          const stageTotalBudget = columnLeads.reduce(
            (sum, l) => sum + (l.estimatedBudget ? Number(l.estimatedBudget) : 0),
            0,
          );

          return (
            <div
              key={stage.id}
              className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-3 shadow-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color || '#3b82f6' }}
                  />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {stage.name}
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {stageTotalBudget > 0 && (
                <div className="pt-1.5 pb-2 text-[11px] font-semibold text-slate-500">
                  Total: ₹{stageTotalBudget.toLocaleString('en-IN')}
                </div>
              )}

              {/* Cards list */}
              <div className="mt-2 flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm hover:border-slate-300 transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/crm/leads/${lead.id}`}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {lead.leadNumber}
                      </Link>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          lead.priority === 'URGENT'
                            ? 'bg-red-100 text-red-800'
                            : lead.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {lead.priority}
                      </span>
                    </div>

                    <Link
                      to={`/crm/leads/${lead.id}`}
                      className="mt-1 block font-semibold text-sm text-slate-900 hover:text-blue-600"
                    >
                      {lead.customerName}
                    </Link>

                    {lead.phone && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </p>
                    )}

                    {lead.estimatedBudget && (
                      <div className="mt-2 text-xs font-bold text-emerald-700">
                        ₹{Number(lead.estimatedBudget).toLocaleString('en-IN')}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <User className="h-3 w-3" />
                        {lead.assignedUser?.name || 'Unassigned'}
                      </span>

                      {/* Stage Move Dropdown */}
                      <select
                        value={stage.id}
                        onChange={(e) => handleMoveStage(lead.id, e.target.value)}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 focus:outline-none"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move to {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {columnLeads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
