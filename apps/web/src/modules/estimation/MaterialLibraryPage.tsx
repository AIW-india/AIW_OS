import { useEffect, useState, type FormEvent } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Download,
  Upload,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

export function MaterialLibraryPage() {
  const { hasPermission } = useAuth();
  const canManageRates = hasPermission('estimation.rates.manage');

  const [materials, setMaterials] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // New Material form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('SQFT');
  const [standardRate, setStandardRate] = useState<number>(0);
  const [vendorRate, setVendorRate] = useState<number | undefined>();
  const [preferredVendor, setPreferredVendor] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const loadData = async () => {
    try {
      const [matRes, catRes] = await Promise.all([
        apiClient.get<any[]>('/estimation/materials?limit=100'),
        apiClient.get<any[]>('/estimation/materials/categories'),
      ]);
      setMaterials(matRes.data);
      setCategories(catRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/estimation/materials', {
        name,
        sku,
        unit,
        standardRate: Number(standardRate),
        vendorRate: vendorRate ? Number(vendorRate) : undefined,
        preferredVendor: preferredVendor || undefined,
        categoryId: categoryId || undefined,
      });
      setName('');
      setSku('');
      setStandardRate(0);
      setVendorRate(undefined);
      setPreferredVendor('');
      setShowAddForm(false);
      setSuccess('Material added successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add material');
    }
  };

  const handleExport = () => {
    window.open('/api/v1/estimation/materials/export/excel', '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<any>('/estimation/materials/import/excel', formData);
      setSuccess(
        `Imported ${res.data.totalProcessed} records: ${res.data.createdCount} created, ${res.data.updatedCount} updated.`,
      );
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to import Excel');
    } finally {
      setImporting(false);
    }
  };

  const filtered = materials.filter((m) => {
    const matchesSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.preferredVendor && m.preferredVendor.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || m.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <LoadingSpinner label="Loading material catalogue..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Material Library</h1>
            <p className="text-sm text-slate-500">
              Standard construction & interior specification items, vendor rates, and SKUs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>

          {canManageRates && (
            <>
              <label className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-indigo-600" />
                {importing ? 'Importing...' : 'Import Excel'}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Material
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
      {success && (
        <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          {success}
        </div>
      )}

      {/* Add Material Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Add New Specification Material</h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Material Name (e.g. Italian Marble Diana)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="SKU Code (e.g. MAT-MRB-001)"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="SQFT">Square Feet (SQFT)</option>
              <option value="RFT">Running Feet (RFT)</option>
              <option value="BAG">Bag (BAG)</option>
              <option value="TON">Tonne (TON)</option>
              <option value="NOS">Numbers (NOS)</option>
              <option value="CUM">Cubic Meter (CUM)</option>
              <option value="KG">Kilogram (KG)</option>
              <option value="LTR">Litre (LTR)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="number"
              required
              step="0.01"
              placeholder="Standard Rate (INR)"
              value={standardRate || ''}
              onChange={(e) => setStandardRate(parseFloat(e.target.value) || 0)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Vendor Rate (Optional)"
              value={vendorRate ?? ''}
              onChange={(e) => setVendorRate(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Preferred Vendor Name"
              value={preferredVendor}
              onChange={(e) => setPreferredVendor(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="">Category (Optional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Save Material
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search materials by name, SKU or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Material Name</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Standard Rate</th>
              <th className="px-4 py-3">Vendor Rate</th>
              <th className="px-4 py-3">Preferred Vendor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{m.sku}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                <td className="px-4 py-3 font-mono">{m.unit}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  ₹{Number(m.standardRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {m.vendorRate
                    ? `₹${Number(m.vendorRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{m.preferredVendor || '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No materials found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
