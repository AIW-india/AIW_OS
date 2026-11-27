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
  { code: 'roles.create', module: 'roles', action: 'create', description: 'Create custom roles', superAdminDefault: true },
  { code: 'roles.manage', module: 'roles', action: 'manage', description: 'Update roles, configure permissions, and assign user roles', superAdminDefault: true },

  // Projects
  { code: 'projects.view', module: 'projects', action: 'view', description: 'View projects', superAdminDefault: true },
  { code: 'projects.create', module: 'projects', action: 'create', description: 'Create new projects', superAdminDefault: true },
  { code: 'projects.update', module: 'projects', action: 'update', description: 'Update project details and settings', superAdminDefault: true },
  { code: 'projects.assign', module: 'projects', action: 'assign', description: 'Assign project teams and members', superAdminDefault: true },
  { code: 'projects.membership.manage', module: 'projects', action: 'manage', description: 'Manage user project memberships', superAdminDefault: true },
  { code: 'projects.costs.view', module: 'projects', action: 'view_costs', description: 'View project financial costs and budget utilisation', superAdminDefault: true },

  // Designs
  { code: 'designs.view', module: 'designs', action: 'view', description: 'View drawings, renders, and revisions', superAdminDefault: true },
  { code: 'designs.create', module: 'designs', action: 'create', description: 'Create and upload designs and revisions', superAdminDefault: true },
  { code: 'designs.update', module: 'designs', action: 'update', description: 'Update designs and drawings', superAdminDefault: true },
  { code: 'designs.approve_internal', module: 'designs', action: 'approve_internal', description: 'Internal design review and sign-off', superAdminDefault: true },
  { code: 'designs.approve_client', module: 'designs', action: 'approve_client', description: 'Client approval status recording', superAdminDefault: true },

  // Site Operations & DPR
  { code: 'site.dpr.create', module: 'site', action: 'create_dpr', description: 'Create and submit daily progress reports', superAdminDefault: true },
  { code: 'site.dpr.review', module: 'site', action: 'review_dpr', description: 'Review and sign-off daily progress reports', superAdminDefault: true },
  { code: 'site.photos.upload', module: 'site', action: 'upload_photos', description: 'Upload site photographs and progress evidence', superAdminDefault: true },
  { code: 'site.materials.request', module: 'site', action: 'request_materials', description: 'Raise site material requirement requests', superAdminDefault: true },
  { code: 'site.inspections.manage', module: 'site', action: 'manage_inspections', description: 'Schedule and perform site quality inspections', superAdminDefault: true },

  // Procurement
  { code: 'procurement.requests.view', module: 'procurement', action: 'view_requests', description: 'View procurement and material requests', superAdminDefault: true },
  { code: 'procurement.requests.create', module: 'procurement', action: 'create_requests', description: 'Raise procurement material requests', superAdminDefault: true },
  { code: 'procurement.vendors.manage', module: 'procurement', action: 'manage_vendors', description: 'Manage vendor directory and qualifications', superAdminDefault: true },
  { code: 'procurement.quotations.compare', module: 'procurement', action: 'compare_quotations', description: 'Compare vendor quotations and rates', superAdminDefault: true },
  { code: 'procurement.orders.create', module: 'procurement', action: 'create_orders', description: 'Draft and prepare purchase orders', superAdminDefault: true },
  { code: 'procurement.deliveries.manage', module: 'procurement', action: 'manage_deliveries', description: 'Record material receipts and delivery info', superAdminDefault: true },
  { code: 'procurement.inventory.view', module: 'procurement', action: 'view_inventory', description: 'View stock and inventory levels', superAdminDefault: true },
  { code: 'procurement.approve', module: 'procurement', action: 'approve', description: 'Approve standard procurement purchase orders', superAdminDefault: true },
  { code: 'procurement.approve_high_value', module: 'procurement', action: 'approve_high_value', description: 'Approve high-value purchase orders (Restricted)', superAdminDefault: false },

  // Finance & Accounts
  { code: 'finance.records.view', module: 'finance', action: 'view_records', description: 'View financial ledgers, bills and budgets', superAdminDefault: true },
  { code: 'finance.expenses.view', module: 'finance', action: 'view_expenses', description: 'View company expense submissions', superAdminDefault: true },
  { code: 'finance.expenses.create', module: 'finance', action: 'create_expenses', description: 'Record expense entries and claims', superAdminDefault: true },
  { code: 'finance.expenses.approve', module: 'finance', action: 'approve_expenses', description: 'Approve business expenses and reimbursements', superAdminDefault: false },
  { code: 'finance.receipts.manage', module: 'finance', action: 'manage_receipts', description: 'Record client receipts and payments', superAdminDefault: true },
  { code: 'finance.payments.manage', module: 'finance', action: 'manage_payments', description: 'Prepare vendor and sub-contractor payments', superAdminDefault: true },
  { code: 'finance.payments.approve', module: 'finance', action: 'approve_payments', description: 'Approve vendor payments and disbursements (Restricted)', superAdminDefault: false },

  // Attendance & Workforce
  { code: 'attendance.check_in', module: 'attendance', action: 'check_in', description: 'Worker check-in with GPS and selfie verification', superAdminDefault: true },
  { code: 'attendance.check_out', module: 'attendance', action: 'check_out', description: 'Worker check-out with GPS verification', superAdminDefault: true },
  { code: 'attendance.view_own', module: 'attendance', action: 'view_own', description: 'View personal attendance logs and history', superAdminDefault: true },
  { code: 'attendance.view_team', module: 'attendance', action: 'view_team', description: 'View team and site worker attendance', superAdminDefault: true },
  { code: 'attendance.manage', module: 'attendance', action: 'manage', description: 'Manage and correct workforce attendance records', superAdminDefault: true },
  { code: 'workforce.view', module: 'workforce', action: 'view', description: 'View workforce and contractor rosters', superAdminDefault: true },
  { code: 'workforce.create', module: 'workforce', action: 'create', description: 'Onboard and register new workforce members', superAdminDefault: true },
  { code: 'workforce.update', module: 'workforce', action: 'update', description: 'Update workforce profiles and skill credentials', superAdminDefault: true },

  // Audit Logs
  { code: 'audit.view', module: 'audit', action: 'view', description: 'Review organisation audit logs', superAdminDefault: true },

  // CRM — Leads
  { code: 'crm.leads.view', module: 'crm', action: 'view', description: 'View CRM leads', superAdminDefault: true },
  { code: 'crm.leads.create', module: 'crm', action: 'create', description: 'Create CRM leads', superAdminDefault: true },
  { code: 'crm.leads.update', module: 'crm', action: 'update', description: 'Update CRM lead details', superAdminDefault: true },
  { code: 'crm.leads.assign', module: 'crm', action: 'assign', description: 'Assign and reassign CRM leads', superAdminDefault: true },
  { code: 'crm.leads.delete', module: 'crm', action: 'delete', description: 'Archive and restore CRM leads', superAdminDefault: true },
  { code: 'crm.leads.convert', module: 'crm', action: 'convert', description: 'Convert leads to customers', superAdminDefault: true },

  // CRM — Customers
  { code: 'crm.customers.view', module: 'crm', action: 'view', description: 'View CRM customers', superAdminDefault: true },
  { code: 'crm.customers.manage', module: 'crm', action: 'manage', description: 'Create and manage CRM customers', superAdminDefault: true },

  // CRM — Follow-ups & Site Visits
  { code: 'crm.followups.manage', module: 'crm', action: 'manage', description: 'Manage follow-ups', superAdminDefault: true },
  { code: 'crm.site_visits.manage', module: 'crm', action: 'manage', description: 'Manage site visits', superAdminDefault: true },

  // CRM — Reports & Pipeline Config
  { code: 'crm.reports.view', module: 'crm', action: 'view', description: 'View CRM reports and dashboard', superAdminDefault: true },
  { code: 'crm.pipeline.manage', module: 'crm', action: 'manage', description: 'Configure pipeline stages, lead sources, lost reasons', superAdminDefault: true },

  // Estimation & BOQ (Phase 2)
  { code: 'estimation.rates.view', module: 'estimation', action: 'view_rates', description: 'View material and labour rate libraries', superAdminDefault: true },
  { code: 'estimation.rates.manage', module: 'estimation', action: 'manage_rates', description: 'Create, update, and import/export material and labour rates', superAdminDefault: true },
  { code: 'estimation.estimates.view', module: 'estimation', action: 'view_estimates', description: 'View estimates and BOQs', superAdminDefault: true },
  { code: 'estimation.estimates.create', module: 'estimation', action: 'create_estimates', description: 'Create draft estimates and BOQs', superAdminDefault: true },
  { code: 'estimation.estimates.update', module: 'estimation', action: 'update_estimates', description: 'Edit BOQ items, margins, wastage, and revision estimates', superAdminDefault: true },
  { code: 'estimation.templates.manage', module: 'estimation', action: 'manage_templates', description: 'Manage reusable BOQ templates', superAdminDefault: true },

  // Quotation Management (Phase 2)
  { code: 'estimation.quotations.view', module: 'estimation', action: 'view_quotations', description: 'View quotations and revision history', superAdminDefault: true },
  { code: 'estimation.quotations.create', module: 'estimation', action: 'create_quotations', description: 'Generate quotation from an estimate', superAdminDefault: true },
  { code: 'estimation.quotations.update', module: 'estimation', action: 'update_quotations', description: 'Update terms, payment schedules, and create revisions', superAdminDefault: true },
  { code: 'estimation.quotations.dispatch', module: 'estimation', action: 'dispatch_quotations', description: 'Dispatch approved quotation to client (Requires approval)', superAdminDefault: true },
  { code: 'quotations.approve', module: 'quotations', action: 'approve', description: 'Approve client commercial quotations and discounts (Restricted)', superAdminDefault: false },
];

export interface PredefinedRoleTemplate {
  code: string;
  name: string;
  description: string;
  defaultPermissions: string[];
}

export const PREDEFINED_ROLE_TEMPLATES: PredefinedRoleTemplate[] = [
  {
    code: 'ORGANISATION_SUPER_ADMIN',
    name: 'Organisation Super Admin',
    description: 'General organisation administrator with complete IAM and operational access. Excludes commercial/financial approval authority.',
    defaultPermissions: BASELINE_PERMISSIONS.filter((p) => p.superAdminDefault).map((p) => p.code),
  },
  {
    code: 'ADMIN',
    name: 'Admin',
    description: 'General operational administrator. Manages users, workforce, and operational modules without financial or high-value purchase approval authority.',
    defaultPermissions: [
      'organisation.view',
      'users.view', 'users.create', 'users.update',
      'departments.view', 'departments.manage',
      'designations.view', 'designations.manage',
      'roles.view',
      'projects.view', 'projects.create', 'projects.update', 'projects.assign', 'projects.membership.manage',
      'workforce.view', 'workforce.create', 'workforce.update',
      'attendance.view_team', 'attendance.manage',
      'crm.leads.view', 'crm.leads.create', 'crm.leads.update', 'crm.leads.assign', 'crm.leads.convert',
      'crm.customers.view', 'crm.customers.manage',
      'crm.followups.manage', 'crm.site_visits.manage', 'crm.reports.view',
      'estimation.rates.view', 'estimation.rates.manage',
      'estimation.estimates.view', 'estimation.estimates.create', 'estimation.estimates.update', 'estimation.templates.manage',
      'estimation.quotations.view', 'estimation.quotations.create', 'estimation.quotations.update',
      'procurement.requests.view', 'procurement.inventory.view',
      'audit.view',
    ],
  },
  {
    code: 'PROJECT_MANAGER',
    name: 'Project Manager',
    description: 'Manages assigned projects, milestones, designs, site DPR review, inspections, and material requests within permitted scope. Cannot approve high-value procurement or commercial quotations.',
    defaultPermissions: [
      'projects.view', 'projects.update', 'projects.assign', 'projects.membership.manage', 'projects.costs.view',
      'designs.view', 'designs.approve_internal',
      'site.dpr.review', 'site.photos.upload', 'site.inspections.manage',
      'procurement.requests.create', 'procurement.requests.view',
      'estimation.rates.view', 'estimation.estimates.view', 'estimation.estimates.create', 'estimation.estimates.update',
      'estimation.templates.manage', 'estimation.quotations.view',
      'attendance.view_team',
      'crm.site_visits.manage',
    ],
  },
  {
    code: 'SITE_ENGINEER',
    name: 'Site Engineer / Supervisor',
    description: 'Field engineer responsible for site execution, daily progress reports (DPR), site attendance, photos, quality inspections, and material requests. No financial or company-wide administrative access.',
    defaultPermissions: [
      'projects.view',
      'designs.view',
      'site.dpr.create', 'site.photos.upload', 'site.materials.request', 'site.inspections.manage',
      'estimation.rates.view', 'estimation.estimates.view',
      'attendance.view_team', 'attendance.check_in', 'attendance.check_out', 'attendance.view_own',
      'crm.site_visits.manage',
    ],
  },
  {
    code: 'ARCHITECT_INTERIOR_DESIGNER',
    name: 'Architect / Interior Designer',
    description: 'Designs blueprints, 3D renders, and revisions. Submits designs for internal and client reviews. Cannot act as final independent commercial/financial approver.',
    defaultPermissions: [
      'projects.view',
      'designs.view', 'designs.create', 'designs.update', 'designs.approve_client',
      'estimation.estimates.view', 'estimation.rates.view',
      'attendance.check_in', 'attendance.check_out', 'attendance.view_own',
    ],
  },
  {
    code: 'ACCOUNTS',
    name: 'Accounts',
    description: 'Manages financial records, client receipts, expense entries, vendor payment vouchers, and approved quotations. Separate approval required for payment release.',
    defaultPermissions: [
      'projects.view', 'projects.costs.view',
      'finance.records.view', 'finance.expenses.view', 'finance.expenses.create',
      'finance.receipts.manage', 'finance.payments.manage',
      'estimation.estimates.view', 'estimation.quotations.view', 'estimation.rates.view',
      'procurement.orders.create', 'procurement.deliveries.manage', 'procurement.inventory.view',
      'attendance.check_in', 'attendance.check_out', 'attendance.view_own',
    ],
  },
  {
    code: 'PROCUREMENT',
    name: 'Procurement',
    description: 'Manages vendors, prepares purchase orders, compares quotations, tracks inventory and deliveries. Does not receive high-value purchase authority.',
    defaultPermissions: [
      'procurement.requests.view', 'procurement.vendors.manage',
      'procurement.quotations.compare', 'procurement.orders.create',
      'procurement.deliveries.manage', 'procurement.inventory.view',
      'procurement.approve',
      'estimation.rates.view', 'estimation.rates.manage',
      'projects.view',
      'attendance.check_in', 'attendance.check_out', 'attendance.view_own',
    ],
  },
  {
    code: 'HR_OFFICE_ADMIN',
    name: 'HR / Office Admin',
    description: 'Manages employee records, departments, designations, workforce onboarding, and attendance records. No commercial or financial approval access.',
    defaultPermissions: [
      'users.view', 'users.create', 'users.update',
      'departments.view', 'departments.manage',
      'designations.view', 'designations.manage',
      'workforce.view', 'workforce.create', 'workforce.update',
      'attendance.view_team', 'attendance.manage', 'attendance.view_own',
      'attendance.check_in', 'attendance.check_out',
    ],
  },
  {
    code: 'WORKER_CONTRACTOR',
    name: 'Worker / Contractor',
    description: 'Field workforce member. Access restricted strictly to personal attendance check-in, check-out, and attendance history.',
    defaultPermissions: [
      'attendance.check_in',
      'attendance.check_out',
      'attendance.view_own',
    ],
  },
];

/**
 * Ensures all baseline permissions exist in the global permissions table.
 * Uses a single query to find missing ones, then batch-inserts only what's new.
 */
let baselinePermissionsEnsured = false;

export async function ensureBaselinePermissions(): Promise<void> {
  if (baselinePermissionsEnsured) return;

  const existingCodes = new Set(
    (await prisma.permission.findMany({ select: { code: true } })).map((p) => p.code),
  );

  const toCreate = BASELINE_PERMISSIONS.filter((p) => !existingCodes.has(p.code));

  if (toCreate.length > 0) {
    await prisma.permission.createMany({
      data: toCreate.map((p) => ({
        code: p.code,
        module: p.module,
        action: p.action,
        description: p.description,
      })),
      skipDuplicates: true,
    });
  }

  baselinePermissionsEnsured = true;
}

/**
 * Seeds or synchronizes the 9 predefined role templates for an organisation.
 * If a role already exists, it is NOT overwritten (custom permissions are preserved).
 * Missing roles are created with their default template permissions.
 * Uses batch operations to minimise round-trips.
 */
export async function seedOrganisationRoleTemplates(organisationId: string): Promise<void> {
  await ensureBaselinePermissions();

  const allPerms = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  // Fetch all existing roles in one query
  const existingRoles = await prisma.role.findMany({
    where: { organisationId },
    select: { code: true },
  });
  const existingCodes = new Set(existingRoles.map((r) => r.code));

  const missingTemplates = PREDEFINED_ROLE_TEMPLATES.filter(
    (t) => !existingCodes.has(t.code),
  );

  if (missingTemplates.length === 0) return;

  // Batch-create all missing roles in a transaction, then batch-create their permissions
  await prisma.$transaction(async (tx) => {
    for (const template of missingTemplates) {
      const role = await tx.role.create({
        data: {
          organisationId,
          name: template.name,
          code: template.code,
          description: template.description,
          isSystemRole: true,
          status: 'ACTIVE',
        },
      });

      const permIdsToAssign = template.defaultPermissions
        .map((code) => permMap.get(code))
        .filter((id): id is string => Boolean(id));

      if (permIdsToAssign.length > 0) {
        await tx.rolePermission.createMany({
          data: permIdsToAssign.map((permId) => ({
            organisationId,
            roleId: role.id,
            permissionId: permId,
            scopeType: 'ORGANISATION',
            effect: 'ALLOW',
          })),
          skipDuplicates: true,
        });
      }
    }
  });
}

/**
 * Restores a predefined role's permissions to its original factory template defaults.
 */
export async function resetRoleToTemplateDefaults(
  organisationId: string,
  roleId: string,
): Promise<{ role: any; restoredPermissions: string[] }> {
  await ensureBaselinePermissions();

  const role = await prisma.role.findFirst({
    where: { id: roleId, organisationId },
  });

  if (!role) {
    throw new Error('ROLE_NOT_FOUND');
  }

  const template = PREDEFINED_ROLE_TEMPLATES.find((t) => t.code === role.code);
  if (!template) {
    throw new Error('ROLE_NOT_A_PREDEFINED_TEMPLATE');
  }

  const allPerms = await prisma.permission.findMany({
    where: { code: { in: template.defaultPermissions } },
  });

  await prisma.$transaction(async (tx) => {
    // Delete existing mappings
    await tx.rolePermission.deleteMany({
      where: { roleId: role.id, organisationId },
    });

    // Re-create default mappings in a single batch
    await tx.rolePermission.createMany({
      data: allPerms.map((perm) => ({
        organisationId,
        roleId: role.id,
        permissionId: perm.id,
        scopeType: 'ORGANISATION',
        effect: 'ALLOW',
      })),
      skipDuplicates: true,
    });
  });

  return { role, restoredPermissions: template.defaultPermissions };
}

/**
 * Backward compatibility helper for bootstrap flow.
 * Provisions all 9 predefined role templates and returns the ORGANISATION_SUPER_ADMIN role.
 */
export async function provisionOrganisationSuperAdminRole(organisationId: string) {
  await seedOrganisationRoleTemplates(organisationId);

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: {
      organisationId_code: {
        organisationId,
        code: 'ORGANISATION_SUPER_ADMIN',
      },
    },
  });

  return superAdminRole;
}
