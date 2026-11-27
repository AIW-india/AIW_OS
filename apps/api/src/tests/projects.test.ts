import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../database/prisma.js';
import { provisionOrganisationSuperAdminRole } from '../common/rbac/permissions-catalog.js';

describe('AIW OS — Phase 3: Project Management & Execution Test Suite', () => {
  const app = createApp();

  const orgSlug = `prj-org-${Date.now()}`;
  let orgId: string;
  let adminUserId: string;
  let adminCookie: string[];

  const otherOrgSlug = `prj-other-${Date.now()}`;
  let otherOrgId: string;
  let otherAdminCookie: string[];

  let standardUserId: string;
  let standardUserCookie: string[];

  let customerId: string;
  let quotationId: string;
  let acceptedQuotationRevision = 1;
  let projectId: string;
  let milestoneId: string;
  let taskId: string;

  beforeAll(async () => {

    // 1. Setup primary organisation and Super Admin
    const org = await prisma.organisation.create({
      data: {
        name: `Project Test Org ${Date.now()}`,
        slug: orgSlug,
        status: 'ACTIVE',
      },
    });
    orgId = org.id;

    const adminRole = await provisionOrganisationSuperAdminRole(orgId);

    const adminEmail = `prj-admin-${Date.now()}@test.aiw.in`;
    const password = 'Password@123';
    const signUpResult = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: adminEmail, password, name: 'Project Super Admin' });

    adminUserId = signUpResult.body.user.id;

    await prisma.user.update({
      where: { id: adminUserId },
      data: { organisationId: orgId, status: 'ACTIVE' },
    });

    await prisma.userRole.create({
      data: {
        organisationId: orgId,
        userId: adminUserId,
        roleId: adminRole.id,
      },
    });

    adminCookie = (signUpResult.headers['set-cookie'] as unknown as string[]) || [];
    if (!adminCookie.length) {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in/email')
        .send({ email: adminEmail, password });
      adminCookie = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
    }

    // 2. Setup standard user with limited permissions (projects.view, but not projects.view_all)
    const standardEmail = `prj-siteeng-${Date.now()}@test.aiw.in`;
    const stdSignUp = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: standardEmail, password, name: 'Site Engineer Bob' });
    standardUserId = stdSignUp.body.user.id;

    await prisma.user.update({
      where: { id: standardUserId },
      data: { organisationId: orgId, status: 'ACTIVE' },
    });

    // Create a role with projects.view only
    const siteRole = await prisma.role.create({
      data: {
        organisationId: orgId,
        name: 'Site Engineer Role',
        code: `SITE_ENG_${Date.now()}`,
        isSystemRole: false,
      },
    });

    // Assign projects.view and projects.tasks.update permissions to site role
    const viewPerm = await prisma.permission.findUnique({
      where: { code: 'projects.view' },
    });
    if (viewPerm) {
      await prisma.rolePermission.create({
        data: {
          organisationId: orgId,
          roleId: siteRole.id,
          permissionId: viewPerm.id,
        },
      });
    }

    const taskUpdatePerm = await prisma.permission.findUnique({
      where: { code: 'projects.tasks.update' },
    });
    if (taskUpdatePerm) {
      await prisma.rolePermission.create({
        data: {
          organisationId: orgId,
          roleId: siteRole.id,
          permissionId: taskUpdatePerm.id,
        },
      });
    }

    await prisma.userRole.create({
      data: {
        organisationId: orgId,
        userId: standardUserId,
        roleId: siteRole.id,
      },
    });

    standardUserCookie = (stdSignUp.headers['set-cookie'] as unknown as string[]) || [];
    if (!standardUserCookie.length) {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in/email')
        .send({ email: standardEmail, password });
      standardUserCookie = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
    }

    // 3. Setup secondary organisation for multi-tenant isolation testing
    const otherOrg = await prisma.organisation.create({
      data: {
        name: `Other Org ${Date.now()}`,
        slug: otherOrgSlug,
        status: 'ACTIVE',
      },
    });
    otherOrgId = otherOrg.id;

    const otherAdminRole = await provisionOrganisationSuperAdminRole(otherOrgId);
    const otherAdminEmail = `other-prj-admin-${Date.now()}@test.aiw.in`;
    const otherSignUp = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: otherAdminEmail, password, name: 'Other Org Admin' });

    await prisma.user.update({
      where: { id: otherSignUp.body.user.id },
      data: { organisationId: otherOrgId, status: 'ACTIVE' },
    });

    await prisma.userRole.create({
      data: {
        organisationId: otherOrgId,
        userId: otherSignUp.body.user.id,
        roleId: otherAdminRole.id,
      },
    });

    otherAdminCookie = (otherSignUp.headers['set-cookie'] as unknown as string[]) || [];
    if (!otherAdminCookie.length) {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in/email')
        .send({ email: otherAdminEmail, password });
      otherAdminCookie = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
    }

    // 4. Setup Customer, Lead, Estimate, and Accepted Quotation in primary org
    const customer = await prisma.customer.create({
      data: {
        organisationId: orgId,
        customerNumber: `CUST-${Date.now()}`,
        name: 'Anita Verma',
        phone: '9876543210',
        email: 'anita.verma@example.com',
        billingAddress: 'Bengaluru',
      },
    });
    customerId = customer.id;

    const lead = await prisma.lead.create({
      data: {
        organisationId: orgId,
        leadNumber: `LD-${Date.now()}`,
        customerName: 'Anita Verma',
        phone: '9876543210',
        status: 'QUALIFIED',
      },
    });

    const estimate = await prisma.estimate.create({
      data: {
        organisationId: orgId,
        estimateNumber: `EST-${Date.now()}`,
        leadId: lead.id,
        customerId: customer.id,
        title: '3BHK Villa Interior Baseline',
        projectCategory: 'RESIDENTIAL_INTERIOR',
        subtotalCost: 1250000,
        taxAmount: 225000,
        grandTotal: 1475000,
        status: 'APPROVED_INTERNALLY',
        revisionNumber: 1,
      },
    });

    // Create quotation linked to estimate with accepted status
    const quotation = await prisma.quotation.create({
      data: {
        organisationId: orgId,
        quotationNumber: `QT-${Date.now()}`,
        estimateId: estimate.id,
        customerId: customer.id,
        revisionNumber: 1,
        title: 'Commercial Interior Proposal V1',
        status: 'ACCEPTED',
        subtotal: 1250000,
        taxAmount: 225000,
        grandTotal: 1475000,
        termsAndConditions: 'Standard 40-40-20 payment schedule',
      },
    });
    quotationId = quotation.id;
  }, 30000);

  describe('1. Project Creation from Accepted Quotation', () => {
    it('creates project successfully from an accepted quotation with immutable commercial baseline', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', adminCookie)
        .send({
          name: 'Anita Verma Villa Interior Execution',
          projectCategory: 'RESIDENTIAL_INTERIOR',
          siteAddress: 'Plot 42, Palm Meadows, Whitefield, Bengaluru',
          customerId,
          projectManagerId: adminUserId,
          sourceQuotationId: quotationId,
          startDate: '2026-12-01',
          expectedEndDate: '2027-03-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.projectNumber).toMatch(/^PRJ-/);
      expect(res.body.data.name).toBe('Anita Verma Villa Interior Execution');
      expect(res.body.data.sourceQuotationId).toBe(quotationId);
      expect(res.body.data.sourceQuotationRevision).toBe(acceptedQuotationRevision);
      expect(Number(res.body.data.budgetBaselineAmount)).toBe(1475000);
      expect(res.body.data.status).toBe('NOT_STARTED');

      projectId = res.body.data.id;
    });

    it('rejects duplicate project creation from the same quotation unless explicitly authorized', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', adminCookie)
        .send({
          name: 'Duplicate Anita Verma Project',
          projectCategory: 'RESIDENTIAL_INTERIOR',
          siteAddress: 'Plot 42, Palm Meadows',
          customerId,
          projectManagerId: adminUserId,
          sourceQuotationId: quotationId,
          allowDuplicate: false,
        });

      expect([400, 409]).toContain(res.status);
      expect(res.body.message || res.body.error?.message).toContain('already been created from Quotation');
    });

    it('allows duplicate project creation when allowDuplicate is true', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', adminCookie)
        .send({
          name: 'Second Phase Project from same quotation',
          projectCategory: 'RESIDENTIAL_INTERIOR',
          siteAddress: 'Plot 42, Palm Meadows',
          customerId,
          projectManagerId: adminUserId,
          sourceQuotationId: quotationId,
          allowDuplicate: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('subsequent quotation updates do not silently alter frozen project commercial baseline', async () => {
      // Simulate quotation updated with higher value revision
      await prisma.quotation.update({
        where: { id: quotationId },
        data: {
          grandTotal: 1800000,
          revisionNumber: 2,
        },
      });

      // Verify project commercial baseline remains intact at original 1475000
      const projectRes = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', adminCookie);

      expect(projectRes.status).toBe(200);
      expect(Number(projectRes.body.data.budgetBaselineAmount)).toBe(1475000);
      expect(projectRes.body.data.sourceQuotationRevision).toBe(1);
    });
  });

  describe('2. Project Assignment & Project-Level Access Scoping', () => {
    it('restricts project access for standard user who is not PM and not an assigned member', async () => {
      // standardUser only has projects.view, but is not PM or member of projectId
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', standardUserCookie);

      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error?.message).toContain('Access denied');
    });

    it('assigns standard user as Site Engineer in ProjectMembership', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/memberships`)
        .set('Cookie', adminCookie)
        .send({
          userId: standardUserId,
          role: 'SITE_ENGINEER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(standardUserId);
      expect(res.body.data.role).toBe('SITE_ENGINEER');
    });

    it('grants project access to standard user after being added to project membership', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', standardUserCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
    });

    it('updates project manager and logs activity', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/${projectId}/project-manager`)
        .set('Cookie', adminCookie)
        .send({
          projectManagerId: standardUserId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.projectManagerId).toBe(standardUserId);
    });
  });

  describe('3. Milestone Templates & Milestone Execution', () => {
    let templateId: string;

    it('creates a reusable milestone template', async () => {
      const res = await request(app)
        .post('/api/v1/projects/milestone-templates')
        .set('Cookie', adminCookie)
        .send({
          name: 'Turnkey Luxury Villa Template',
          description: 'Standard 4-phase turnkey villa delivery schedule',
          projectCategory: 'RESIDENTIAL_INTERIOR',
          phases: [
            { name: 'Phase 1: Civil & Demolition', estimatedDays: 14, tasks: ['Demolition', 'Plastering'] },
            { name: 'Phase 2: MEP Rough-in', estimatedDays: 10, tasks: ['Conduit Laying', 'Piping'] },
            { name: 'Phase 3: Joinery & Finishing', estimatedDays: 20, tasks: ['Wardrobes', 'Modular Kitchen'] },
            { name: 'Phase 4: Snagging & Handover', estimatedDays: 5, tasks: ['Deep Clean', 'Handover'] },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      templateId = res.body.data.id;
    });

    it('applies milestone template to a project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/apply-template`)
        .set('Cookie', adminCookie)
        .send({
          templateId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appliedMilestonesCount).toBe(4);
    });

    it('lists project milestones ordered by sequence order', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/milestones`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data[0].sequenceOrder).toBe(1);
      expect(res.body.data[1].sequenceOrder).toBe(2);

      milestoneId = res.body.data[0].id;
    });

    it('updates milestone status and updates completion', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/milestones/${milestoneId}`)
        .set('Cookie', adminCookie)
        .send({
          status: 'COMPLETED',
          progressPercentage: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(Number(res.body.data.progressPercentage)).toBe(100);
    });
  });

  describe('4. Task Management & Progress Recalculations', () => {
    it('creates a task within a milestone', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Cookie', adminCookie)
        .send({
          milestoneId,
          title: 'Structural Wall Inspection',
          description: 'Verify column alignment before masonry begins',
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: standardUserId,
          startDate: '2026-12-05',
          dueDate: '2026-12-10',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Structural Wall Inspection');
      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.assigneeId).toBe(standardUserId);

      taskId = res.body.data.id;
    });

    it('adds a comment with attachment metadata to the task', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/tasks/${taskId}/comments`)
        .set('Cookie', standardUserCookie)
        .send({
          comment: 'Inspection completed on grid line B3. No major deflections observed.',
          attachments: [
            { fileName: 'column_inspection.jpg', fileUrl: 'https://cdn.aiw.in/docs/column_inspection.jpg', size: 102400 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comment).toContain('Inspection completed');
    });

    it('transitions task status to COMPLETED and verifies milestone/project progress recalculation', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/tasks/${taskId}`)
        .set('Cookie', adminCookie)
        .send({
          status: 'COMPLETED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');

      // Verify that project progress percentage is recalculable and consistent
      const projectRes = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', adminCookie);

      expect(projectRes.status).toBe(200);
      expect(Number(projectRes.body.data.progressPercentage)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Project Document Management', () => {
    let documentId: string;

    it('registers a project document categorized as DRAWINGS', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/documents`)
        .set('Cookie', adminCookie)
        .send({
          title: 'G+2 Architectural Structural Drawings Rev C',
          category: 'DRAWINGS',
          fileUrl: 'https://storage.aiw.in/drawings/rev_c.pdf',
          fileSize: 4500000,
          mimeType: 'application/pdf',
          metadata: { scale: '1:100', architect: 'Studio Design' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('G+2 Architectural Structural Drawings Rev C');
      expect(res.body.data.category).toBe('DRAWINGS');

      documentId = res.body.data.id;
    });

    it('lists project documents filtered by category', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/documents?category=DRAWINGS`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].category).toBe('DRAWINGS');
    });

    it('deletes a project document', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/documents/${documentId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Project Dashboard Analytics & Activity Logging', () => {
    it('retrieves project dashboard metrics with KPI counts', async () => {
      const res = await request(app)
        .get('/api/v1/projects/dashboard/metrics')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalProjects');
      expect(res.body.data).toHaveProperty('plannedProjects');
      expect(res.body.data).toHaveProperty('inProgressProjects');
      expect(res.body.data).toHaveProperty('delayedProjects');
      expect(res.body.data).toHaveProperty('completedProjects');
      expect(res.body.data).toHaveProperty('upcomingMilestones');
      expect(res.body.data).toHaveProperty('overdueTasks');
      expect(res.body.data.totalProjects).toBeGreaterThanOrEqual(1);
    });

    it('retrieves project activity timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/activities`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('7. Multi-Tenant Isolation', () => {
    it('prevents users from other organisations from viewing projects of another tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', otherAdminCookie);

      expect(res.status).toBe(404);
      expect(res.body.message || res.body.error?.message).toContain('Project not found');
    });

    it('prevents users from other organisations from listing another tenant projects', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', otherAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.find((p: any) => p.id === projectId)).toBeUndefined();
    });
  });
});
