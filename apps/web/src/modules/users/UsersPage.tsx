import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Users, UserX, UserCheck, Shield, Building, Award, Settings2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { usePermission, PermissionGate } from '@/lib/auth/usePermission';
import { AccessDeniedPage } from '@/components/feedback/AccessDeniedPage';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  employeeCode?: string | null;
  status: string;
  departmentId?: string | null;
  designationId?: string | null;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
  userRoles: { role: { id: string; name: string; code: string } }[];
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Designation {
  id: string;
  name: string;
  code: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
}

export function UsersPage() {
  const canView = usePermission('users.view');
  const canCreate = usePermission('users.create');
  const canUpdate = usePermission('users.update');
  const canDeactivate = usePermission('users.deactivate');
  const canManageRoles = usePermission('roles.manage');

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Create Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesig, setSelectedDesig] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Edit / Assignment Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesigId, setEditDesigId] = useState('');
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [usersRes, deptsRes, desigsRes, rolesRes] = await Promise.all([
        apiClient.get<UserRecord[]>('/users'),
        apiClient.get<Department[]>('/departments').catch(() => ({ data: [] })),
        apiClient.get<Designation[]>('/designations').catch(() => ({ data: [] })),
        apiClient.get<Role[]>('/roles').catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setDepartments(deptsRes.data || []);
      setDesignations(desigsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [canView]);

  if (!canView) {
    return <AccessDeniedPage requiredPermission="users.view" moduleName="User Management" />;
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setError('You do not have permission to create users');
      return;
    }
    setError(null);
    try {
      await apiClient.post('/users', {
        name,
        email,
        password,
        departmentId: selectedDept || undefined,
        designationId: selectedDesig || undefined,
        roleIds: selectedRole ? [selectedRole] : undefined,
      });
      setName('');
      setEmail('');
      setPassword('');
      setSelectedDept('');
      setSelectedDesig('');
      setSelectedRole('');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    }
  };

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setEditDeptId(u.departmentId || u.department?.id || '');
    setEditDesigId(u.designationId || u.designation?.id || '');
    setEditRoleIds(u.userRoles.map((ur) => ur.role.id));
  };

  const handleSaveAssignments = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSavingEdit(true);
    try {
      // 1. Update department and designation if permitted
      if (canUpdate) {
        await apiClient.patch(`/users/${editingUser.id}`, {
          departmentId: editDeptId || null,
          designationId: editDesigId || null,
        });
      }

      // 2. Update roles if permitted
      if (canManageRoles) {
        await apiClient.put(`/users/${editingUser.id}/roles`, {
          roleIds: editRoleIds,
        });
      }

      setEditingUser(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update user assignments');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleStatus = async (user: UserRecord) => {
    if (!canDeactivate) return;
    setError(null);
    try {
      const action = user.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
      await apiClient.post(`/users/${user.id}/${action}`, {});
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update user status');
    }
  };

  if (loading) return <LoadingSpinner label="Loading users..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">User & Employee Management</h1>
          <p className="text-sm text-slate-500">
            Create staff members, assign departments, job designations, and appropriate CRM roles.
          </p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Create User Form — Gated by users.create */}
      <PermissionGate permission="users.create">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Add New Employee</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="email"
              required
              placeholder="Work Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Initial Password (min 8 chars) *"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-slate-700"
            >
              <option value="">Select Department (Optional)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={selectedDesig}
              onChange={(e) => setSelectedDesig(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-slate-700"
            >
              <option value="">Select Designation (Optional)</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-slate-700"
            >
              <option value="">Assign Role (Optional)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="sm:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Create Employee
              </button>
            </div>
          </form>
        </div>
      </PermissionGate>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Assigned Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {u.department ? (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                      <Building className="h-3 w-3 text-slate-500" />
                      {u.department.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {u.designation ? (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                      <Award className="h-3 w-3 text-slate-500" />
                      {u.designation.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {u.userRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles.map((ur) => (
                        <span
                          key={ur.role.id}
                          className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700"
                        >
                          <Shield className="h-3 w-3 text-blue-500" />
                          {ur.role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-amber-600 font-medium">No roles assigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    {(canUpdate || canManageRoles) && (
                      <button
                        onClick={() => openEditModal(u)}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        title="Assign or change Department, Designation, and Roles"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-blue-600" /> Assign & Edit
                      </button>
                    )}
                    {canDeactivate && (
                      <button
                        onClick={() => void toggleStatus(u)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {u.status === 'ACTIVE' ? (
                          <>
                            <UserX className="h-3.5 w-3.5 text-red-600" /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Reactivate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Assignments Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleSaveAssignments}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign Department, Designation & Roles</h3>
                <p className="text-xs text-slate-500">
                  Editing permissions & profile for <span className="font-semibold">{editingUser.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Department</label>
                <select
                  disabled={!canUpdate}
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">No Department Assigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Designation</label>
                <select
                  disabled={!canUpdate}
                  value={editDesigId}
                  onChange={(e) => setEditDesigId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">No Designation Assigned</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Assigned Roles (Select one or more)
                </label>
                <div className="rounded-md border border-slate-200 p-3 space-y-2 max-h-48 overflow-y-auto">
                  {roles.map((r) => {
                    const isChecked = editRoleIds.includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!canManageRoles}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditRoleIds([...editRoleIds, r.id]);
                            } else {
                              setEditRoleIds(editRoleIds.filter((id) => id !== r.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span>{r.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({r.code})</span>
                      </label>
                    );
                  })}
                  {roles.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">No roles configured in system.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit || (!canUpdate && !canManageRoles)}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
