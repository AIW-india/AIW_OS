import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { PermissionGate } from '@/lib/auth/usePermission';

interface CustomerContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  isPrimary: boolean;
}

interface CustomerAddress {
  id: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isPrimary: boolean;
}

interface CustomerNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: { name: string } | null;
}

interface CustomerDetails {
  id: string;
  customerNumber: string;
  name: string;
  legalName: string | null;
  type: string;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  status: string;
  createdAt: string;
  convertedFromLead?: {
    id: string;
    leadNumber: string;
    customerName: string;
    createdAt: string;
  } | null;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  notes: CustomerNote[];
}

export function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / Input states
  const [newNote, setNewNote] = useState('');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cRole, setCRole] = useState('');
  const [cPrimary, setCPrimary] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [aType, setAType] = useState('SITE');
  const [aLine1, setALine1] = useState('');
  const [aCity, setACity] = useState('');
  const [aState, setAState] = useState('');
  const [aPincode, setAPincode] = useState('');
  const [aPrimary, setAPrimary] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiClient.get<CustomerDetails>(`/crm/customers/${id}`);
      setCustomer(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim()) return;
    try {
      await apiClient.post(`/crm/customers/${id}/notes`, { content: newNote.trim() });
      setNewNote('');
      fetchCustomer();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !cName.trim()) return;
    try {
      await apiClient.post(`/crm/customers/${id}/contacts`, {
        name: cName.trim(),
        phone: cPhone.trim() || undefined,
        email: cEmail.trim() || undefined,
        role: cRole.trim() || undefined,
        isPrimary: cPrimary,
      });
      setContactModalOpen(false);
      setCName('');
      setCPhone('');
      setCEmail('');
      setCRole('');
      setCPrimary(false);
      fetchCustomer();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id || !window.confirm('Delete this contact?')) return;
    try {
      await apiClient.delete(`/crm/customers/${id}/contacts/${contactId}`);
      fetchCustomer();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !aLine1.trim() || !aCity.trim()) return;
    try {
      await apiClient.post(`/crm/customers/${id}/addresses`, {
        type: aType,
        line1: aLine1.trim(),
        city: aCity.trim(),
        state: aState.trim(),
        pincode: aPincode.trim(),
        isPrimary: aPrimary,
      });
      setAddressModalOpen(false);
      setALine1('');
      setACity('');
      setAState('');
      setAPincode('');
      setAPrimary(false);
      fetchCustomer();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!id || !window.confirm('Delete this address?')) return;
    try {
      await apiClient.delete(`/crm/customers/${id}/addresses/${addressId}`);
      fetchCustomer();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete address');
    }
  };

  if (loading) return <LoadingSpinner label="Loading customer details..." />;

  if (error || !customer) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">Customer Not Found</p>
        <p className="mt-1 text-sm">{error || 'The requested customer does not exist.'}</p>
        <Link to="/crm/customers" className="mt-4 inline-block text-xs font-semibold text-blue-600 underline">
          Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/crm/customers" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-500">{customer.customerNumber}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  customer.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {customer.status}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {customer.type}
              </span>
            </div>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{customer.name}</h1>
          </div>
        </div>

        {customer.convertedFromLead && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
            <span className="text-slate-500">Converted from Lead: </span>
            <Link
              to={`/crm/leads/${customer.convertedFromLead.id}`}
              className="font-bold font-mono text-blue-700 hover:underline"
            >
              {customer.convertedFromLead.leadNumber}
            </Link>
          </div>
        )}
      </div>

      {/* Grid: Details, Addresses & Contacts, Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Account Overview
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="block text-xs font-medium text-slate-400">Primary Phone</span>
                <span className="font-semibold text-slate-800">{customer.phone || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Primary Email</span>
                <span className="font-semibold text-slate-800">{customer.email || '—'}</span>
              </div>
              {customer.legalName && (
                <div>
                  <span className="block text-xs font-medium text-slate-400">Legal Business Name</span>
                  <span className="font-semibold text-slate-800">{customer.legalName}</span>
                </div>
              )}
              {customer.billingAddress && (
                <div className="sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-400">Billing Address</span>
                  <span className="font-semibold text-slate-800">{customer.billingAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Multiple Contacts */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Key Contacts & Stakeholders</h2>
              <PermissionGate permission="crm.customers.manage">
                <button
                  onClick={() => setContactModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Contact
                </button>
              </PermissionGate>
            </div>
            <div className="mt-4 space-y-2">
              {customer.contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{c.name}</span>
                      {c.isPrimary && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
                          PRIMARY
                        </span>
                      )}
                      {c.role && <span className="text-slate-500">({c.role})</span>}
                    </div>
                    <div className="mt-1 flex gap-4 text-slate-600">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <PermissionGate permission="crm.customers.manage">
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                </div>
              ))}
              {customer.contacts.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No additional contacts registered.</p>
              )}
            </div>
          </div>

          {/* Site & Billing Addresses */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Sites & Locations</h2>
              <PermissionGate permission="crm.customers.manage">
                <button
                  onClick={() => setAddressModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Site Address
                </button>
              </PermissionGate>
            </div>
            <div className="mt-4 space-y-2">
              {customer.addresses.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 font-bold uppercase text-[10px] text-slate-800">
                        {a.type}
                      </span>
                      {a.isPrimary && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-slate-800">{a.line1}</p>
                    <p className="text-slate-500">{a.city}, {a.state} - {a.pincode}</p>
                  </div>
                  <PermissionGate permission="crm.customers.manage">
                    <button
                      onClick={() => handleDeleteAddress(a.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                </div>
              ))}
              {customer.addresses.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No site addresses configured.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit space-y-4">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Customer Notes
          </h2>
          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add interaction note, preference, or call minutes..."
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
            >
              Post Note
            </button>
          </form>

          <div className="space-y-3 pt-2">
            {customer.notes.map((note) => (
              <div key={note.id} className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs">
                <p className="text-slate-800 whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                  <span>{note.createdBy?.name || 'Staff'}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {customer.notes.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No notes recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleAddContact} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Add Customer Contact</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Phone</label>
                <input
                  type="tel"
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Email</label>
                <input
                  type="email"
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Role / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Spouse, Site Architect, Procurement Manager"
                  value={cRole}
                  onChange={(e) => setCRole(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cPrimary"
                  checked={cPrimary}
                  onChange={(e) => setCPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="cPrimary" className="text-xs font-semibold text-slate-700">
                  Mark as Primary Contact
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Address Modal */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleAddAddress} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Add Site / Billing Address</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Address Type</label>
                <select
                  value={aType}
                  onChange={(e) => setAType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="SITE">Site / Construction Address</option>
                  <option value="BILLING">Billing Address</option>
                  <option value="CORRESPONDENCE">Correspondence Address</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Address Line *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot/Flat number, building, street"
                  value={aLine1}
                  onChange={(e) => setALine1(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">City *</label>
                  <input
                    type="text"
                    required
                    value={aCity}
                    onChange={(e) => setACity(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">State</label>
                  <input
                    type="text"
                    value={aState}
                    onChange={(e) => setAState(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Pincode</label>
                <input
                  type="text"
                  value={aPincode}
                  onChange={(e) => setAPincode(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="aPrimary"
                  checked={aPrimary}
                  onChange={(e) => setAPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="aPrimary" className="text-xs font-semibold text-slate-700">
                  Mark as Primary Address
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
