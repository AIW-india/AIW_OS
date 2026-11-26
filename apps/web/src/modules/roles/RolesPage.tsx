import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Shield,
  Plus,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  Info,
  Lock,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useAuth } from '@/lib/auth/AuthContext';

interface PermissionRecord {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string | null;
}

interface RoleRecord {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystemRole: boolean;
  rolePermissions: { permission: PermissionRecord }[];
  _count?: { userRoles: number };
}

interface RoleTemplate {
  code: string;
  name: string;
  description: string;
  defaultPermissions: string[];
}

export function RolesPage() {
  const { hasPermission } = useAuth();
  const canManageRoles = hasPermission('roles.manage');

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');

  const [activeRolePermCodes, setActiveRolePermCodes] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadData = async () => {
    try {
      const [rolesRes, permsRes, tmplRes] = await Promise.all([
        apiClient.get<RoleRecord[]>('/roles'),
        apiClient.get<PermissionRecord[]>('/roles/permissions'),
        apiClient.get<RoleTemplate[]>('/roles/templates'),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
      setTemplates(tmplRes.data);

      if (!selectedRoleId && rolesRes.data.length > 0) {
        selectRole(rolesRes.data[0]);
      } else if (selectedRoleId) {
        const found = rolesRes.data.find((r) => r.id === selectedRoleId);
        if (found) selectRole(found);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectRole = (role: RoleRecord) => {
    setSelectedRoleId(role.id);
    const codes = new Set(role.rolePermissions.map((rp) => rp.permission.code));
    setActiveRolePermCodes(codes);
    setIsDirty(false);
    setShowResetConfirm(false);
  };

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const selectedTemplate = useMemo(() => {
    if (!selectedRole) return null;
    return templates.find((t) => t.code === selectedRole.code) || null;
  }, [selectedRole, templates]);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, PermissionRecord[]>();
    for (const p of permissions) {
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [permissions]);

  const availableModules = useMemo(() => {
    return Array.from(permissionsByModule.keys()).sort();
  }, [permissionsByModule]);

  // Filtered permissions according to search and module filter
  const filteredPermissionsByModule = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = new Map<string, PermissionRecord[]>();

    for (const [mod, perms] of permissionsByModule.entries()) {
      if (selectedModuleFilter !== 'ALL' && mod !== selectedModuleFilter) {
        continue;
      }
      const matches = perms.filter(
        (p) =>
          !q ||
          p.code.toLowerCase().includes(q) ||
          p.module.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
      if (matches.length > 0) {
        result.set(mod, matches);
      }
    }
    return result;
  }, [permissionsByModule, searchQuery, selectedModuleFilter]);

  const togglePermission = (permCode: string) => {
    if (!canManageRoles) return;
    const next = new Set(activeRolePermCodes);
    if (next.has(permCode)) {
      next.delete(permCode);
    } else {
      next.add(permCode);
    }
    setActiveRolePermCodes(next);
    setIsDirty(true);
  };

  const toggleAllInModule = (modPerms: PermissionRecord[]) => {
    if (!canManageRoles) return;
    const allActive = modPerms.every((p) => activeRolePermCodes.has(p.code));
    const next = new Set(activeRolePermCodes);
    for (const p of modPerms) {
      if (allActive) {
        next.delete(p.code);
      } else {
        next.add(p.code);
      }
    }
    setActiveRolePermCodes(next);
    setIsDirty(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || !canManageRoles) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient.put(`/roles/${selectedRole.id}/permissions`, {
        permissionCodes: Array.from(activeRolePermCodes),
      });
      setSuccessMessage(`Permissions updated successfully for ${selectedRole.name}.`);
      setIsDirty(false);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!selectedRole || !canManageRoles) return;
    setResetting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.post<{ permissions: string[] }>(
        `/roles/${selectedRole.id}/reset-defaults`,
      );
      setActiveRolePermCodes(new Set(res.data.permissions));
      setIsDirty(false);
      setShowResetConfirm(false);
      setSuccessMessage(`Restored factory default permissions for ${selectedRole.name}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to restore default permissions');
    } finally {
      setResetting(false);
    }
  };

  const handleSeedMissingTemplates = async () => {
    if (!canManageRoles) return;
    setSeeding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient.post('/roles/seed-templates');
      setSuccessMessage('Predefined templates synchronized successfully. Existing custom permissions preserved.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to synchronize templates');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateCustomRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageRoles) return;
    setError(null);
    try {
      const res = await apiClient.post<RoleRecord>('/roles', {
        name,
        code,
        description: description || undefined,
      });
      setName('');
      setCode('');
      setDescription('');
      setShowCreateForm(false);
      setSuccessMessage(`Role ${res.data.name} created successfully.`);
      await loadData();
      selectRole(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create role');
    }
  };

  if (loading) return <LoadingSpinner label="Loading roles, templates & permissions..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Roles & Permissions</h1>
            <p className="text-sm text-slate-500">
              Manage organisation role templates, custom roles, and fine-grained authorization policies.
            </p>
          </div>
        </div>

        {canManageRoles && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSeedMissingTemplates()}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              title="Ensure all 9 predefined role templates exist in this organisation"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              {seeding ? 'Syncing...' : 'Sync Default Templates'}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Custom Role
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
      {successMessage && (
        <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          {successMessage}
        </div>
      )}

      {/* Create Custom Role Inline Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateCustomRole}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Create New Custom Role</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Role Name (e.g. Quality Auditor)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="Code (e.g. QUALITY_AUDITOR)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Save Role
            </button>
          </div>
        </form>
      )}

      {/* Main Layout: Master List (Left) + Detail & Permission Matrix (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Roles Roster */}
        <div className="lg:col-span-4 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Organisation Roles ({roles.length})
            </div>
            <div className="divide-y divide-slate-100">
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRole(r)}
                    className={`w-full text-left p-3 rounded-md transition-colors flex items-start justify-between ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 border border-blue-200'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        <span className="truncate">{r.name}</span>
                        {r.isSystemRole && (
                          <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                            TEMPLATE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{r.code}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isSelected ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.rolePermissions.length} perms
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Permission Matrix & Role Details */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRole ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Role Header Banner */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedRole.name}</h2>
                    {selectedRole.isSystemRole ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        System Template
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        Custom Role
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-mono">Code: {selectedRole.code}</p>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {selectedRole.description || selectedTemplate?.description || 'No description provided.'}
                  </p>
                </div>

                {/* Actions: Save & Restore Defaults */}
                {canManageRoles && (
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedRole.isSystemRole && selectedTemplate && (
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(true)}
                        disabled={resetting || saving}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        title="Restore permissions to the standard predefined factory template"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                        Restore Defaults
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSavePermissions()}
                      disabled={!isDirty || saving}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
                    </button>
                  </div>
                )}
              </div>

              {/* Reset Confirmation Dialog */}
              {showResetConfirm && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Reset to factory default permissions?</span>
                      <p className="text-xs text-amber-800 mt-1">
                        This will overwrite any customized permissions currently granted to{' '}
                        <strong>{selectedRole.name}</strong> and re-apply the factory template defaults (
                        {selectedTemplate?.defaultPermissions.length} permissions).
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="rounded border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleResetToDefaults()}
                      disabled={resetting}
                      className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {resetting ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                  </div>
                </div>
              )}

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search permissions by name, code or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Module:</span>
                  <select
                    value={selectedModuleFilter}
                    onChange={(e) => setSelectedModuleFilter(e.target.value)}
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none"
                  >
                    <option value="ALL">All Modules ({availableModules.length})</option>
                    {availableModules.map((m) => (
                      <option key={m} value={m}>
                        {m.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permissions Summary Bar */}
              <div className="flex items-center justify-between rounded-md bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
                <span>
                  <strong>{activeRolePermCodes.size}</strong> of {permissions.length} permissions granted
                </span>
                {isDirty && (
                  <span className="font-semibold text-amber-600 animate-pulse">
                    ● Unsaved permission changes
                  </span>
                )}
              </div>

              {/* Permissions Categories Matrix */}
              <div className="space-y-4">
                {Array.from(filteredPermissionsByModule.entries()).map(([moduleName, modPerms]) => {
                  const allSelected = modPerms.every((p) => activeRolePermCodes.has(p.code));

                  return (
                    <div
                      key={moduleName}
                      className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                    >
                      {/* Module Section Header */}
                      <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {moduleName}
                          </span>
                          <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                            {modPerms.length}
                          </span>
                        </div>
                        {canManageRoles && (
                          <button
                            type="button"
                            onClick={() => toggleAllInModule(modPerms)}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      {/* Permissions List */}
                      <div className="divide-y divide-slate-100 p-2">
                        {modPerms.map((perm) => {
                          const isChecked = activeRolePermCodes.has(perm.code);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                              } ${!canManageRoles ? 'pointer-events-none' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!canManageRoles}
                                onChange={() => togglePermission(perm.code)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-900 font-mono">
                                    {perm.code}
                                  </span>
                                  {perm.code.includes('high_value') ||
                                  perm.code.includes('payments.approve') ||
                                  perm.code.includes('quotations.approve') ? (
                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                      <Lock className="h-2.5 w-2.5" /> High Authority
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {perm.description || 'No description available'}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {filteredPermissionsByModule.size === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No permissions match your filter criteria.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              Select a role from the left to inspect and configure its permission profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
