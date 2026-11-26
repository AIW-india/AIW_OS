import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../database/prisma.js';
import { auth } from '../common/auth/better-auth.js';
import { provisionOrganisationSuperAdminRole } from '../common/rbac/permissions-catalog.js';

const app = createApp();

describe('Phase 0 IAM Security, RBAC, Bootstrap & Tenant Isolation', () => {
  const runId = crypto.randomBytes(4).toString('hex');

  const orgA = {
    name: `AIW India Test ${runId}`,
    slug: `aiw-india-test-${runId}`,
    adminName: 'Super Admin A',
    adminEmail: `admin-a-${runId}@aiw-test.local`,
    adminPassword: 'Password123!',
  };

  const orgB = {
    name: `Tenant B Test ${runId}`,
    slug: `tenant-b-test-${runId}`,
    adminName: 'Super Admin B',
    adminEmail: `admin-b-${runId}@tenant-b.local`,
    adminPassword: 'Password123!',
  };

  let orgAId = '';
  let orgBId = '';
  let adminAId = '';
  let adminACookies: string[] = [];
  let adminBCookies: string[] = [];
  let standardUserId = '';
  let standardUserCookies: string[] = [];
  let viewerRoleId = '';
  let orgADeptId = '';
  let orgADesigId = '';

  beforeAll(async () => {
    // Clean any leftover test organisations from a previous interrupted test run
    const leftoverOrgs = await prisma.organisation.findMany({
      where: { slug: { contains: '-test-' } },
      select: { id: true },
    });
    for (const o of leftoverOrgs) {
      await prisma.user.deleteMany({ where: { organisationId: o.id } });
      await prisma.organisation.deleteMany({ where: { id: o.id } });
    }
    const orgCount = await prisma.organisation.count();
    if (orgCount === 0) {
      await prisma.systemMetadata.deleteMany({ where: { key: 'bootstrap_lock' } });
    }

    // 1. Provision or Bootstrap Org A
    const orgCountBefore = await prisma.organisation.count();
    let bootstrapped = false;

    if (orgCountBefore === 0) {
      const resA = await request(app).post('/api/v1/auth/bootstrap').send({
        organisationName: orgA.name,
        organisationSlug: orgA.slug,
        adminName: orgA.adminName,
        adminEmail: orgA.adminEmail,
        adminPassword: orgA.adminPassword,
      });
      expect(resA.status).toBe(201);
      orgAId = resA.body.data.organisation.id;
      adminAId = resA.body.data.user.id;
      bootstrapped = true;
    } else {
      // An organisation already exists in the dev database (e.g. created by user in UI)
      // Provision test organisation A directly for isolated security test execution
      const createdOrgA = await prisma.organisation.create({
        data: { name: orgA.name, slug: orgA.slug, status: 'ACTIVE' },
      });
      orgAId = createdOrgA.id;
      const roleA = await provisionOrganisationSuperAdminRole(orgAId);
      const signUpA = await auth.api.signUpEmail({
        body: { email: orgA.adminEmail, password: orgA.adminPassword, name: orgA.adminName },
      });
      adminAId = signUpA.user.id;
      await prisma.user.update({
        where: { id: adminAId },
        data: { organisationId: orgAId, status: 'ACTIVE' },
      });
      await prisma.userRole.create({
        data: {
          organisationId: orgAId,
          userId: adminAId,
          roleId: roleA.id,
          assignedByUserId: adminAId,
        },
      });
    }

    // 2. Provision Org B directly in DB for cross-tenant isolation tests
    const createdOrgB = await prisma.organisation.create({
      data: { name: orgB.name, slug: orgB.slug, status: 'ACTIVE' },
    });
    orgBId = createdOrgB.id;
    const roleB = await provisionOrganisationSuperAdminRole(orgBId);
    const signUpB = await auth.api.signUpEmail({
      body: { email: orgB.adminEmail, password: orgB.adminPassword, name: orgB.adminName },
    });
    await prisma.user.update({
      where: { id: signUpB.user.id },
      data: { organisationId: orgBId, status: 'ACTIVE' },
    });
    await prisma.userRole.create({
      data: {
        organisationId: orgBId,
        userId: signUpB.user.id,
        roleId: roleB.id,
        assignedByUserId: signUpB.user.id,
      },
    });
  }, 60000);

  afterAll(async () => {
    if (orgAId) {
      await prisma.userRole.deleteMany({ where: { organisationId: orgAId } });
      await prisma.rolePermission.deleteMany({ where: { organisationId: orgAId } });
      await prisma.role.deleteMany({ where: { organisationId: orgAId } });
      await prisma.user.deleteMany({ where: { organisationId: orgAId } });
      await prisma.organisation.deleteMany({ where: { id: orgAId } });
    }
    if (orgBId) {
      await prisma.userRole.deleteMany({ where: { organisationId: orgBId } });
      await prisma.rolePermission.deleteMany({ where: { organisationId: orgBId } });
      await prisma.role.deleteMany({ where: { organisationId: orgBId } });
      await prisma.user.deleteMany({ where: { organisationId: orgBId } });
      await prisma.organisation.deleteMany({ where: { id: orgBId } });
    }
    await prisma.systemMetadata.deleteMany({ where: { key: 'bootstrap_lock' } });
    await prisma.$disconnect();
  }, 60000);

  it('1. Prevents repeat bootstrap after initial organisation setup', async () => {
    const repeatRes = await request(app).post('/api/v1/auth/bootstrap').send({
      organisationName: 'Rogue Org',
      organisationSlug: `rogue-${runId}`,
      adminName: 'Rogue Admin',
      adminEmail: `rogue-${runId}@evil.local`,
      adminPassword: 'Password123!',
    });
    expect(repeatRes.status).toBe(403);
    expect(repeatRes.body.error.code).toBe('BOOTSTRAP_DISABLED');
  });

  it('2. Rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('3. Authenticates Super Admin A and enforces separation of duties', async () => {
    const loginRes = await request(app).post('/api/v1/auth/sign-in/email').send({
      email: orgA.adminEmail,
      password: orgA.adminPassword,
    });
    expect(loginRes.status).toBe(200);
    adminACookies = loginRes.headers['set-cookie'] as unknown as string[];

    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', adminACookies);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.roles).toContain('ORGANISATION_SUPER_ADMIN');
    expect(meRes.body.data.permissions).not.toContain('quotations.approve');
    expect(meRes.body.data.permissions).not.toContain('procurement.approve_high_value');
  });

  it('4. Prevents self-role elevation', async () => {
    const res = await request(app)
      .put(`/api/v1/users/${adminAId}/roles`)
      .set('Cookie', adminACookies)
      .send({ roleIds: [] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELF_ROLE_MODIFICATION_DENIED');
  });

  it('5. Creates role, department, designation, and user, and enforces RBAC', async () => {
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Cookie', adminACookies)
      .send({ name: 'Engineering', code: `ENG_${runId}` });
    expect(deptRes.status).toBe(201);
    orgADeptId = deptRes.body.data.id;

    const desigRes = await request(app)
      .post('/api/v1/designations')
      .set('Cookie', adminACookies)
      .send({ name: 'Site Engineer', code: `SE_${runId}` });
    expect(desigRes.status).toBe(201);
    orgADesigId = desigRes.body.data.id;

    const roleRes = await request(app)
      .post('/api/v1/roles')
      .set('Cookie', adminACookies)
      .send({ name: 'Viewer', code: 'VIEWER', permissionCodes: ['users.view'] });
    expect(roleRes.status).toBe(201);
    viewerRoleId = roleRes.body.data.id;

    const userRes = await request(app)
      .post('/api/v1/users')
      .set('Cookie', adminACookies)
      .send({
        name: 'Standard User',
        email: `user-${runId}@aiw-test.local`,
        password: 'Password123!',
        departmentId: orgADeptId,
        designationId: orgADesigId,
        roleIds: [viewerRoleId],
      });
    expect(userRes.status).toBe(201);
    standardUserId = userRes.body.data.id;

    const loginRes = await request(app).post('/api/v1/auth/sign-in/email').send({
      email: `user-${runId}@aiw-test.local`,
      password: 'Password123!',
    });
    standardUserCookies = loginRes.headers['set-cookie'] as unknown as string[];

    const forbiddenRes = await request(app)
      .post('/api/v1/users')
      .set('Cookie', standardUserCookies)
      .send({ name: 'X', email: `x-${runId}@aiw-test.local`, password: 'Password123!' });
    expect(forbiddenRes.status).toBe(403);
  }, 20000);

  it('6. Rejects cross-tenant user, role, department, designation, and audit-log access', async () => {    const loginB = await request(app).post('/api/v1/auth/sign-in/email').send({
      email: orgB.adminEmail,
      password: orgB.adminPassword,
    });
    adminBCookies = loginB.headers['set-cookie'] as unknown as string[];

    // Cross-tenant header spoofing
    const spoofRes = await request(app)
      .get('/api/v1/users')
      .set('Cookie', adminBCookies)
      .set('x-organisation-id', orgAId);
    expect(spoofRes.status).toBe(403);

    // Cross-tenant user ID manipulation
    const patchUserRes = await request(app)
      .patch(`/api/v1/users/${standardUserId}`)
      .set('Cookie', adminBCookies)
      .send({ name: 'Hacked' });
    expect(patchUserRes.status).toBe(404);

    // Cross-tenant role assignment
    const roleAssignRes = await request(app)
      .put(`/api/v1/users/${standardUserId}/roles`)
      .set('Cookie', adminBCookies)
      .send({ roleIds: [viewerRoleId] });
    expect(roleAssignRes.status).toBe(404);

    // Cross-tenant department & designation access
    const deptPatchRes = await request(app)
      .patch(`/api/v1/departments/${orgADeptId}`)
      .set('Cookie', adminBCookies)
      .send({ name: 'Hacked Dept' });
    expect(deptPatchRes.status).toBe(404);

    const desigPatchRes = await request(app)
      .patch(`/api/v1/designations/${orgADesigId}`)
      .set('Cookie', adminBCookies)
      .send({ name: 'Hacked Desig' });
    expect(desigPatchRes.status).toBe(404);

    // Cross-tenant audit-log isolation
    const auditB = await request(app).get('/api/v1/audit-logs').set('Cookie', adminBCookies);
    expect(auditB.status).toBe(200);
    const orgIdsInAuditB = auditB.body.data.map((a: { organisationId: string }) => a.organisationId);
    expect(orgIdsInAuditB).not.toContain(orgAId);
  }, 20000);

  it('7. Supports single-use invitation acceptance and invalidates token after use', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.invitation.create({
      data: {
        organisationId: orgAId,
        email: `invited-${runId}@aiw-test.local`,
        invitedByUserId: adminAId,
        roleId: viewerRoleId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60000),
        status: 'PENDING',
      },
    });

    const acceptRes = await request(app).post('/api/v1/auth/accept-invitation').send({
      token: rawToken,
      name: 'Invited User',
      password: 'Password123!',
    });
    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.data.user.organisationId).toBe(orgAId);

    // Reusing the same token must fail
    const reuseRes = await request(app).post('/api/v1/auth/accept-invitation').send({
      token: rawToken,
      name: 'Invited User 2',
      password: 'Password123!',
    });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('INVALID_INVITATION');
  });

  it('8. Deactivates user and blocks access; deactivates organisation and blocks access', async () => {
    const deactUser = await request(app)
      .post(`/api/v1/users/${standardUserId}/deactivate`)
      .set('Cookie', adminACookies)
      .send({});
    expect(deactUser.status).toBe(200);

    const meAfterUserDeact = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', standardUserCookies);
    expect([401, 403]).toContain(meAfterUserDeact.status);

    // Deactivate Org B and verify Org B admin is blocked from organisation-scoped routes
    const deactOrgB = await request(app)
      .post('/api/v1/organisations/current/deactivate')
      .set('Cookie', adminBCookies)
      .send({});
    expect(deactOrgB.status).toBe(200);

    const orgBUsersAfterDeact = await request(app)
      .get('/api/v1/users')
      .set('Cookie', adminBCookies);
    expect(orgBUsersAfterDeact.status).toBe(403);
    expect(orgBUsersAfterDeact.body.error.code).toBe('ORGANISATION_INACTIVE');
  });
});
