import { prisma } from '../../src/database/prisma.js';
import {
  seedOrganisationRoleTemplates,
  syncSuperAdminPermissions,
} from '../../src/common/rbac/permissions-catalog.js';

export interface SeedOrgContext {
  organisationId: string;
  organisationName: string;
  superAdminUserId: string;
  departments: Record<string, string>;
  designations: Record<string, string>;
  roles: Record<string, string>;
}

const DEMO_DEPARTMENTS = [
  'Project Management',
  'Site Operations',
  'Design & Architecture',
  'Finance & Accounts',
  'Procurement & Supply Chain',
  'HR & Administration',
  'Field Workforce',
];

const DEMO_DESIGNATIONS = [
  'Operations Admin',
  'Project Manager',
  'Senior Site Engineer',
  'Site Engineer',
  'Lead Architect',
  'Interior Designer',
  'Accounts Executive',
  'Procurement Officer',
  'HR Executive',
  'Site Supervisor',
  'Skilled Contractor',
];

export async function seedOrganisationContext(): Promise<SeedOrgContext> {
  // 1. Reuse existing AIW organisation (never delete or overwrite)
  let org = await prisma.organisation.findUnique({ where: { slug: 'aiw' } });
  if (!org) {
    org = await prisma.organisation.findFirst({ where: { status: 'ACTIVE' } });
  }
  if (!org) {
    throw new Error('No active organisation found in database. Please bootstrap an organisation first.');
  }

  // 2. Ensure all 9 role templates & Phase 3 Super Admin permissions exist
  await seedOrganisationRoleTemplates(org.id);
  await syncSuperAdminPermissions();

  // 3. Find existing Super Admin user (never modify or overwrite)
  const superAdminRole = await prisma.role.findFirst({
    where: { organisationId: org.id, code: 'ORGANISATION_SUPER_ADMIN' },
  });
  let superAdminUserId = '';
  if (superAdminRole) {
    const ur = await prisma.userRole.findFirst({
      where: { organisationId: org.id, roleId: superAdminRole.id },
      select: { userId: true },
    });
    if (ur) superAdminUserId = ur.userId;
  }
  if (!superAdminUserId) {
    const firstUser = await prisma.user.findFirst({
      where: { organisationId: org.id, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!firstUser) throw new Error('No active user found in AIW organisation.');
    superAdminUserId = firstUser.id;
  }

  // 4. Ensure Departments (idempotent by name)
  const existingDepts = await prisma.department.findMany({
    where: { organisationId: org.id },
  });
  const deptMap: Record<string, string> = {};
  for (const d of existingDepts) {
    deptMap[d.name] = d.id;
  }
  for (const name of DEMO_DEPARTMENTS) {
    if (!deptMap[name]) {
      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      const created = await prisma.department.create({
        data: {
          organisationId: org.id,
          name,
          code,
          status: 'ACTIVE',
        },
      });
      deptMap[name] = created.id;
    }
  }

  // 5. Ensure Designations (idempotent by name)
  const existingDesigs = await prisma.designation.findMany({
    where: { organisationId: org.id },
  });
  const desigMap: Record<string, string> = {};
  for (const d of existingDesigs) {
    desigMap[d.name] = d.id;
  }
  for (const name of DEMO_DESIGNATIONS) {
    if (!desigMap[name]) {
      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      const created = await prisma.designation.create({
        data: {
          organisationId: org.id,
          name,
          code,
          status: 'ACTIVE',
        },
      });
      desigMap[name] = created.id;
    }
  }

  // 6. Map Roles by code
  const allRoles = await prisma.role.findMany({
    where: { organisationId: org.id },
  });
  const roleMap: Record<string, string> = {};
  for (const r of allRoles) {
    roleMap[r.code] = r.id;
  }

  return {
    organisationId: org.id,
    organisationName: org.name,
    superAdminUserId,
    departments: deptMap,
    designations: desigMap,
    roles: roleMap,
  };
}
