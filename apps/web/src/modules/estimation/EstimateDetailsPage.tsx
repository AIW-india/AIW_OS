import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  FileText,
  Check,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function EstimateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canUpdate = hasPermission('estimation.estimates.update');
  const canCreateQuote = hasPermission('estimation.quotations.create');

  const [estimate, setEstimate] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [labourRates, setLabourRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable BOQ Sections state
  const [sections, setSections] = useState<any[]>([]);
  const [wastagePercent, setWastagePercent] = useState<number>(0);
  const [overheadPercent, setOverheadPercent] = useState<number>(0);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [isDirty, setIsDirty] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [estRes, matRes, labRes] = await Promise.all([
        apiClient.get<any>(`/estimation/estimates/${id}`),
        apiClient.get<any[]>('/estimation/materials?limit=200'),
        apiClient.get<any[]>('/estimation/labour'),
      ]);
      const est = estRes.data;
      setEstimate(est);
      setMaterials(matRes.data);
      setLabourRates(labRes.data);

      setSections(est.sections || []);
      setWastagePercent(Number(est.wastagePercent) || 0);
      setOverheadPercent(Number(est.overheadPercent) || 0);
      setProfitMarginPercent(Number(est.profitMarginPercent) || 0);
      setDiscountPercent(Number(est.discountPercent) || 0);
      setTaxPercent(Number(est.taxPercent) || 18);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load estimate');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Section & Item Manipulations
  const addSection = () => {
    const newSection = {
      title: `Section ${sections.length + 1}`,
      description: '',
      orderIndex: sections.length,
      items: [],
    };
    setSections([...sections, newSection]);
    setIsDirty(true);
  };

  const removeSection = (sIdx: number) => {
    const next = [...sections];
    next.splice(sIdx, 1);
    setSections(next);
    setIsDirty(true);
  };

  const updateSectionTitle = (sIdx: number, title: string) => {
    const next = [...sections];
    next[sIdx] = { ...next[sIdx], title };
    setSections(next);
    setIsDirty(true);
  };

  const addItemToSection = (sIdx: number) => {
    const next = [...sections];
    const items = [...(next[sIdx].items || [])];
    items.push({
      description: 'New line item description',
      materialId: null,
      materialQty: 1,
      materialUnit: 'SQFT',
      materialRate: 0,
      materialTotal: 0,
      labourRateId: null,
      labourQty: 1,
      labourUnit: 'SQFT',
      labourRate: 0,
      labourTotal: 0,
      otherCharges: 0,
      itemTotal: 0,
    });
    next[sIdx] = { ...next[sIdx], items };
    setSections(next);
    setIsDirty(true);
  };

  const removeItem = (sIdx: number, iIdx: number) => {
    const next = [...sections];
    const items = [...next[sIdx].items];
    items.splice(iIdx, 1);
    next[sIdx] = { ...next[sIdx], items };
    setSections(next);
    setIsDirty(true);
  };

  const updateItem = (sIdx: number, iIdx: number, field: string, value: any) => {
    const next = [...sections];
    const items = [...next[sIdx].items];
    const item = { ...items[iIdx], [field]: value };

    // If selecting material from library, auto-fill unit & rate
    if (field === 'materialId' && value) {
      const selectedMat = materials.find((m) => m.id === value);
      if (selectedMat) {
        item.materialUnit = selectedMat.unit;
        item.materialRate = Number(selectedMat.standardRate);
      }
    }

    // If selecting labour rate from library, auto-fill unit & rate
    if (field === 'labourRateId' && value) {
      const selectedLab = labourRates.find((l) => l.id === value);
      if (selectedLab) {
        item.labourUnit = selectedLab.unit;
        item.labourRate = Number(selectedLab.standardRate);
      }
    }

    // Calculate line-level subtotal
    const mTotal = Number(item.materialQty || 0) * Number(item.materialRate || 0);
    const lTotal = Number(item.labourQty || 0) * Number(item.labourRate || 0);
    const oTotal = Number(item.otherCharges || 0);
    item.materialTotal = Math.round(mTotal * 100) / 100;
    item.labourTotal = Math.round(lTotal * 100) / 100;
    item.itemTotal = Math.round((mTotal + lTotal + oTotal) * 100) / 100;

    items[iIdx] = item;
    next[sIdx] = { ...next[sIdx], items };
    setSections(next);
    setIsDirty(true);
  };

  // Live Estimate Summary Calculation on Frontend
  const computedSummary = () => {
    let mSum = 0;
    let lSum = 0;
    let oSum = 0;

    for (const s of sections) {
      for (const i of s.items || []) {
        mSum += Number(i.materialTotal || 0);
        lSum += Number(i.labourTotal || 0);
        oSum += Number(i.otherCharges || 0);
      }
    }

    const subtotal = mSum + lSum + oSum;
    const wastage = mSum * (wastagePercent / 100);
    const costWithWastage = subtotal + wastage;
    const overhead = costWithWastage * (overheadPercent / 100);
    const costWithOverhead = costWithWastage + overhead;
    const profit = costWithOverhead * (profitMarginPercent / 100);
    const net = costWithOverhead + profit;
    const discount = net * (discountPercent / 100);
    const taxable = Math.max(0, net - discount);
    const tax = taxable * (taxPercent / 100);
    const grand = taxable + tax;

    return {
      mSum,
      lSum,
      oSum,
      subtotal,
      wastage,
      overhead,
      profit,
      discount,
      tax,
      grand,
    };
  };

  const handleSaveBOQ = async () => {
    if (!canUpdate || !id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.put<any>(`/estimation/estimates/${id}`, {
        wastagePercent: Number(wastagePercent),
        overheadPercent: Number(overheadPercent),
        profitMarginPercent: Number(profitMarginPercent),
        discountPercent: Number(discountPercent),
        taxPercent: Number(taxPercent),
        sections,
      });
      setEstimate(res.data);
      setIsDirty(false);
      setSuccess('BOQ changes saved and recalculated successfully.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save BOQ');
    } finally {
      setSaving(false);
    }
  };

  const handleReviseEstimate = async () => {
    if (!id) return;
    setRevising(true);
    setError(null);
    try {
      const res = await apiClient.post<any>(`/estimation/estimates/${id}/revise`);
      navigate(`/estimation/estimates/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create revision');
      setRevising(false);
    }
  };

  const handleGenerateQuotation = async () => {
    if (!estimate) return;
    try {
      const res = await apiClient.post<any>('/estimation/quotations', {
        estimateId: estimate.id,
        title: `Commercial Quotation for ${estimate.title}`,
      });
      navigate(`/estimation/quotations/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate quotation');
    }
  };

  if (loading || !estimate) return <LoadingSpinner label="Loading BOQ Builder..." />;

  const summary = computedSummary();
  const isApproved = estimate.status === 'APPROVED';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/estimation/estimates')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> All Estimates
          </button>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl font-bold text-slate-900">{estimate.title}</h1>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-700">
              {estimate.estimateNumber}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Rev {estimate.revisionNumber}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                estimate.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {estimate.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Category: {estimate.projectCategory.replace(/_/g, ' ')} • Location:{' '}
            {estimate.projectLocation || 'Unspecified'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Create Revision Button */}
          <button
            onClick={handleReviseEstimate}
            disabled={revising}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            title="Create a new revision while preserving this version"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            {revising ? 'Revising...' : 'New Revision'}
          </button>

          {/* Generate Quotation */}
          {canCreateQuote && (
            <button
              onClick={handleGenerateQuotation}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate Quotation
            </button>
          )}

          {/* Save BOQ changes */}
          {canUpdate && !isApproved && (
            <button
              onClick={handleSaveBOQ}
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : isDirty ? 'Save BOQ' : 'Saved'}
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

      {/* Main BOQ Matrix Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* BOQ Sections and Items (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Bill of Quantities (BOQ)</h2>
            {canUpdate && !isApproved && (
              <button
                onClick={addSection}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add Section
              </button>
            )}
          </div>

          {sections.map((sec, sIdx) => (
            <div key={sec.id || sIdx} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <input
                  type="text"
                  disabled={isApproved || !canUpdate}
                  value={sec.title}
                  onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                  className="font-bold text-sm text-slate-800 bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-500 w-1/2"
                />
                <div className="flex items-center gap-2">
                  {canUpdate && !isApproved && (
                    <>
                      <button
                        onClick={() => addItemToSection(sIdx)}
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                      >
                        <Plus className="h-3 w-3" /> Add Item
                      </button>
                      <button
                        onClick={() => removeSection(sIdx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/50 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Material Spec</th>
                      <th className="px-3 py-2 text-right">Mat Qty</th>
                      <th className="px-3 py-2 text-right">Mat Rate</th>
                      <th className="px-3 py-2 text-left">Labour Spec</th>
                      <th className="px-3 py-2 text-right">Lab Rate</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                      {canUpdate && !isApproved && <th className="px-2 py-2 text-center w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sec.items?.map((item: any, iIdx: number) => (
                      <tr key={item.id || iIdx} className="hover:bg-slate-50/60">
                        {/* Description */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            disabled={isApproved || !canUpdate}
                            value={item.description}
                            onChange={(e) => updateItem(sIdx, iIdx, 'description', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none"
                          />
                        </td>

                        {/* Material Spec Dropdown */}
                        <td className="px-3 py-2">
                          <select
                            disabled={isApproved || !canUpdate}
                            value={item.materialId || ''}
                            onChange={(e) => updateItem(sIdx, iIdx, 'materialId', e.target.value || null)}
                            className="w-28 rounded border border-slate-200 text-[11px] py-1 bg-white"
                          >
                            <option value="">Custom Mat</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Material Qty & Unit */}
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              disabled={isApproved || !canUpdate}
                              value={item.materialQty || 0}
                              onChange={(e) =>
                                updateItem(sIdx, iIdx, 'materialQty', parseFloat(e.target.value) || 0)
                              }
                              className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right text-[11px]"
                            />
                            <span className="text-[10px] text-slate-400">{item.materialUnit || 'U'}</span>
                          </div>
                        </td>

                        {/* Material Rate */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isApproved || !canUpdate}
                            value={item.materialRate || 0}
                            onChange={(e) =>
                              updateItem(sIdx, iIdx, 'materialRate', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 rounded border border-slate-200 px-1 py-0.5 text-right text-[11px]"
                          />
                        </td>

                        {/* Labour Spec Dropdown */}
                        <td className="px-3 py-2">
                          <select
                            disabled={isApproved || !canUpdate}
                            value={item.labourRateId || ''}
                            onChange={(e) => updateItem(sIdx, iIdx, 'labourRateId', e.target.value || null)}
                            className="w-28 rounded border border-slate-200 text-[11px] py-1 bg-white"
                          >
                            <option value="">Custom Lab</option>
                            {labourRates.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.code}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Labour Rate */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isApproved || !canUpdate}
                            value={item.labourRate || 0}
                            onChange={(e) =>
                              updateItem(sIdx, iIdx, 'labourRate', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 rounded border border-slate-200 px-1 py-0.5 text-right text-[11px]"
                          />
                        </td>

                        {/* Line Item Total */}
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          ₹{Number(item.itemTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Delete line */}
                        {canUpdate && !isApproved && (
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeItem(sIdx, iIdx)}
                              className="text-slate-300 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!sec.items || sec.items.length === 0) && (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-xs text-slate-400">
                          No items in this section. Click "Add Item" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Markups & Summary Sidebar (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Summary Box */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Financial Summary</h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Material Cost:</span>
                <span className="font-semibold text-slate-900">
                  ₹{summary.mSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Labour Cost:</span>
                <span className="font-semibold text-slate-900">
                  ₹{summary.lSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Base Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  ₹{summary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Wastage ({wastagePercent}%):</span>
                <span>₹{summary.wastage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Overhead ({overheadPercent}%):</span>
                <span>₹{summary.overhead.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Profit Margin ({profitMarginPercent}%):</span>
                <span className="text-emerald-700 font-semibold">
                  ₹{summary.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="text-red-600 font-semibold">
                    -₹{summary.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 text-slate-600">
                <span>GST Tax ({taxPercent}%):</span>
                <span>₹{summary.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-bold text-slate-900 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-indigo-600">
                  ₹{summary.grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Configurable Markups */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Adjust Markups
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-600">Wastage %</label>
                  <input
                    type="number"
                    disabled={isApproved || !canUpdate}
                    value={wastagePercent}
                    onChange={(e) => {
                      setWastagePercent(parseFloat(e.target.value) || 0);
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-slate-200 px-2 py-1 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600">Overhead %</label>
                  <input
                    type="number"
                    disabled={isApproved || !canUpdate}
                    value={overheadPercent}
                    onChange={(e) => {
                      setOverheadPercent(parseFloat(e.target.value) || 0);
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-slate-200 px-2 py-1 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600">Profit Margin %</label>
                  <input
                    type="number"
                    disabled={isApproved || !canUpdate}
                    value={profitMarginPercent}
                    onChange={(e) => {
                      setProfitMarginPercent(parseFloat(e.target.value) || 0);
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-slate-200 px-2 py-1 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600">Discount %</label>
                  <input
                    type="number"
                    disabled={isApproved || !canUpdate}
                    value={discountPercent}
                    onChange={(e) => {
                      setDiscountPercent(parseFloat(e.target.value) || 0);
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-slate-200 px-2 py-1 mt-0.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Revisions History Box */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Revision History</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {estimate.revisions?.map((rev: any) => (
                <Link
                  key={rev.id}
                  to={`/estimation/estimates/${rev.id}`}
                  className="flex items-center justify-between py-2 hover:text-indigo-600"
                >
                  <span className="font-semibold">Revision {rev.revisionNumber}</span>
                  <span className="text-slate-500 font-mono">
                    ₹{Number(rev.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </Link>
              ))}
              {(!estimate.revisions || estimate.revisions.length === 0) && (
                <p className="text-slate-400 py-1">Initial baseline revision (Rev 1).</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
