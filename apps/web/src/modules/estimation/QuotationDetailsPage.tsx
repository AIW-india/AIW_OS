import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Download,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canApprove = hasPermission('quotations.approve');
  const canDispatch = hasPermission('estimation.quotations.dispatch');

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Approval modal state
  const [comments, setComments] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  // Dispatch modal state
  const [showDispatchDialog, setShowDispatchDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get<any>(`/estimation/quotations/${id}`);
      setQuotation(res.data);
      if (res.data.customer?.email) {
        setRecipientEmail(res.data.customer.email);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleApprovalAction = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.post(`/estimation/quotations/${id}/approve`, {
        decision: approvalDecision,
        comments: comments || undefined,
      });
      setShowApprovalDialog(false);
      setComments('');
      setSuccess(`Quotation has been successfully ${approvalDecision.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Approval action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchAction = async () => {
    if (!id || !recipientEmail) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.post(`/estimation/quotations/${id}/dispatch`, {
        recipientEmail,
        channel: 'EMAIL',
      });
      setShowDispatchDialog(false);
      setSuccess(`Quotation officially dispatched to ${recipientEmail}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/v1/estimation/quotations/${id}/pdf`, '_blank');
  };

  if (loading || !quotation) return <LoadingSpinner label="Loading commercial quotation..." />;

  const isApproved = quotation.status === 'APPROVED';
  const isDispatched = quotation.status === 'DISPATCHED';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/estimation/quotations')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> All Quotations
          </button>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl font-bold text-slate-900">{quotation.title}</h1>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-700">
              {quotation.quotationNumber}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Rev {quotation.revisionNumber}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isApproved
                  ? 'bg-emerald-50 text-emerald-700'
                  : quotation.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-50 text-amber-700'
                    : isDispatched
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-red-50 text-red-700'
              }`}
            >
              {quotation.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF button */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>

          {/* Owner Commercial Approval Button (Restricted) */}
          {canApprove && (quotation.status === 'PENDING_APPROVAL' || quotation.status === 'DRAFT') && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setApprovalDecision('APPROVED');
                  setShowApprovalDialog(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve Quotation
              </button>
              <button
                onClick={() => {
                  setApprovalDecision('REJECTED');
                  setShowApprovalDialog(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          )}

          {/* Dispatch to Customer */}
          {canDispatch && isApproved && (
            <button
              onClick={() => setShowDispatchDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch to Client
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
      {success && (
        <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          {success}
        </div>
      )}

      {/* Approval Notice Banner */}
      {!isApproved && !isDispatched && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Authorised Approval Required Before Dispatch</span>
            <p className="mt-0.5 text-amber-700">
              In accordance with AIW OS Commercial Policy, all quotations must be reviewed and officially approved by
              an authorised management approver before client dispatch. Material revisions automatically require
              re-approval.
            </p>
          </div>
        </div>
      )}

      {/* Approval Dialog Modal */}
      {showApprovalDialog && (
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-md space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            {approvalDecision === 'APPROVED' ? 'Approve Commercial Quotation' : 'Reject Commercial Quotation'}
          </h3>
          <textarea
            placeholder="Add review comments, conditions, or reasons for rejection..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full rounded border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowApprovalDialog(false)}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprovalAction}
              disabled={actionLoading}
              className={`rounded px-4 py-1 text-xs font-medium text-white shadow-sm ${
                approvalDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {actionLoading ? 'Processing...' : `Confirm ${approvalDecision}`}
            </button>
          </div>
        </div>
      )}

      {/* Dispatch Dialog Modal */}
      {showDispatchDialog && (
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-md space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Official Client Quotation Dispatch</h3>
          <p className="text-xs text-slate-500">
            This quotation has been officially approved and is cleared for dispatch.
          </p>
          <input
            type="email"
            required
            placeholder="Client Email Address"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDispatchDialog(false)}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatchAction}
              disabled={actionLoading}
              className="rounded bg-indigo-600 px-4 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              {actionLoading ? 'Dispatching...' : 'Confirm Dispatch'}
            </button>
          </div>
        </div>
      )}

      {/* Main Quotation Paper View */}
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900">AIW Operations</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Commercial Architecture & Interiors</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase">Quotation</span>
            <div className="font-mono text-base font-bold text-indigo-600">{quotation.quotationNumber}</div>
            <div className="text-[11px] text-slate-500">Date: {new Date(quotation.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-md">
          <div>
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Client Details</span>
            <p className="font-semibold text-slate-900 text-sm mt-1">{quotation.customer?.name || 'Walk-in Prospect'}</p>
            {quotation.customer?.email && <p className="text-slate-600">{quotation.customer.email}</p>}
            {quotation.customer?.phone && <p className="text-slate-600">{quotation.customer.phone}</p>}
          </div>
          <div>
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Project Scope</span>
            <p className="font-semibold text-slate-900 mt-1">{quotation.estimate?.title}</p>
            <p className="text-slate-500">Linked BOQ: {quotation.estimate?.estimateNumber}</p>
          </div>
        </div>

        {/* Itemised Sections Table */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Itemised BOQ Specification</h3>
          {quotation.estimate?.sections?.map((sec: any) => (
            <div key={sec.id} className="border border-slate-200 rounded-md overflow-hidden text-xs">
              <div className="bg-slate-100/80 px-3 py-1.5 font-bold text-slate-800">{sec.title}</div>
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-1.5">Description</th>
                    <th className="px-3 py-1.5 text-right">Qty</th>
                    <th className="px-3 py-1.5 text-right">Rate</th>
                    <th className="px-3 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sec.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-1.5">{item.description}</td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {item.materialQty || item.labourQty} {item.materialUnit || item.labourUnit}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        ₹{Number(item.materialRate || item.labourRate).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                        ₹{Number(item.itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                ₹{Number(quotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {Number(quotation.discountAmount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span className="text-red-600 font-semibold">
                  -₹{Number(quotation.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxes (GST):</span>
              <span className="font-semibold text-slate-900">
                ₹{Number(quotation.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Grand Total:</span>
              <span className="text-indigo-600">
                ₹{Number(quotation.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        {quotation.termsAndConditions && (
          <div className="border-t border-slate-100 pt-4 text-xs space-y-1">
            <span className="font-bold text-slate-600 uppercase text-[10px]">Commercial Terms & Conditions</span>
            <p className="text-slate-600 whitespace-pre-line leading-relaxed">{quotation.termsAndConditions}</p>
          </div>
        )}

        {/* Audit Log Approvals Timeline */}
        {quotation.approvals && quotation.approvals.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase text-[10px]">Approval Sign-offs</span>
            <div className="space-y-1 text-xs">
              {quotation.approvals.map((appr: any) => (
                <div key={appr.id} className="flex items-center justify-between text-slate-500 py-1">
                  <div>
                    <span className="font-semibold text-slate-900">{appr.approver?.name || 'Authorized Approver'}</span>{' '}
                    marked <strong className="text-slate-900">{appr.decision}</strong>
                    {appr.comments && <span className="text-slate-400"> — "{appr.comments}"</span>}
                  </div>
                  <span className="text-[11px]">{new Date(appr.decidedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
