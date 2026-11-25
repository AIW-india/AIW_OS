import { prisma } from '../../database/prisma.js';

export interface PermissionDef {
  code: string;
  module: string;
  action: string;
  description: string;
  superAdminDefault: boolean;
}

export const BASELINE_PERMISSIONS: PermissionDef[] = [
  // Organisation
  { code: 'organisation.view', module: 'organisation', action: 'view', description: 'View organisation details', superAdminDefault: true },
  { code: 'organisation.manage', module: 'organisation', action: 'manage', description: 'Update organisation settings and status', superAdminDefault: true },

  // Users
  { code: 'users.view', module: 'users', action: 'view', description: 'View organisation users', superAdminDefault: true },
  { code: 'users.create', module: 'users', action: 'create', description: 'Create and invite users', superAdminDefault: true },
  { code: 'users.update', module: 'users', action: 'update', description: 'Update user details, department, designation', superAdminDefault: true },
  { code: 'users.deactivate', module: 'users', action: 'deactivate', description: 'Deactivate and reactivate user accounts', superAdminDefault: true },

  // Departments
  { code: 'departments.view', module: 'departments', action: 'view', description: 'View departments', superAdminDefault: true },
  { code: 'departments.manage', module: 'departments', action: 'manage', description: 'Create, update, and archive departments', superAdminDefault: true },

  // Designations
  { code: 'designations.view', module: 'designations', action: 'view', description: 'View designations', superAdminDefault: true },
  { code: 'designations.manage', module: 'designations', action: 'manage', description: 'Create, update, and archive designations', superAdminDefault: true },

  // Roles & Permissions
  { code: 'roles.view', module: 'roles', action: 'view', description: 'View roles and permissions', superAdminDefault: true },
  { code: 'roles.manage', module: 'roles', action: 'manage', description: 'Create roles, assign permissions, and assign user roles', superAdminDefault: true },

  // Project Access
  { code: 'projects.membership.manage', module: 'projects', action: 'manage', description: 'Manage user project memberships', superAdminDefault: true },

  // Audit Logs
  { code: 'audit.view', module: 'audit', action: 'view', description: 'Review organisation audit logs', superAdminDefault: true },

  // Commercial & Financial Approvals (Separation of Duties: NOT granted to Super Admin by default)
  { code: 'quotations.approve', module: 'quotations', action: 'approve', description: 'Approve client quotations and discounts', superAdminDefault: false },
  { code: 'procurement.approve_high_value', module: 'procurement', action: 'approve', description: 'Approve high-value purchase orders', superAdminDefault: false },
  { code: 'payments.approve', module: 'finance', action: 'approve', description: 'Approve vendor payments', superAdminDefault: false },
];

/**
 * Ensures all baseline permissions exist in the global permissions table.
 */
export async function ensureBaselinePermissions(): Promise<void> {
  for (const perm of BASELINE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
      create: {
        code: perm.code,
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
    });
  }
}

/**
 * Creates the default ORGANISATION_SUPER_ADMIN role for a newly created organisation
 * with all IAM/admin permissions (excluding commercial approval permissions).
 */
export async function provisionOrganisationSuperAdminRole(organisationId: string) {
  await ensureBaselinePermissions();

  const superAdminRole = await prisma.role.upsert({
    where: {
      organisationId_code: {
        organisationId,
        code: 'ORGANISATION_SUPER_ADMIN',
      },
    },
    update: {},
    create: {
      organisationId,
      name: 'Organisation Super Admin',
      code: 'ORGANISATION_SUPER_ADMIN',
      description: 'General organisation administrator (excludes commercial approval authority)',
      isSystemRole: true,
      status: 'ACTIVE',
    },
  });

  const adminPermCodes = BASELINE_PERMISSIONS.filter((p) => p.superAdminDefault).map((p) => p.code);
  const perms = await prisma.permission.findMany({
    where: { code: { in: adminPermCodes } },
  });

  for (const perm of perms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        organisationId,
        roleId: superAdminRole.id,
        permissionId: perm.id,
        scopeType: 'ORGANISATION',
        effect: 'ALLOW',
      },
    });
  }

  return superAdminRole;
}
