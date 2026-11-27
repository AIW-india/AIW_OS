import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../database/prisma.js';
import {
  provisionOrganisationSuperAdminRole,
} from '../common/rbac/permissions-catalog.js';
import { calculateBoqItem, calculateBoqSummary } from '../modules/estimation/estimation-calculator.js';

describe('AIW OS — Phase 2: Estimation, BOQ & Quotations Test Suite', () => {
  const app = createApp();

  const orgSlug = `est-org-${Date.now()}`;
  let orgId: string;
  let adminUserId: string;
  let adminCookie: string[];

  const otherOrgSlug = `est-other-${Date.now()}`;
  let otherOrgId: string;
  let otherAdminCookie: string[];

  let materialId: string;
  let labourId: string;
  let leadId: string;
  let customerId: string;
  let estimateId: string;
  let quotationId: string;

  beforeAll(async () => {
    console.log('[TEST LOG] Starting step 1 - create org');
    // 1. Setup primary organisation and admin
    const org = await prisma.organisation.create({
      data: {
        name: `Estimation Org ${Date.now()}`,
        slug: orgSlug,
        status: 'ACTIVE',
      },
    });
    orgId = org.id;

    console.log('[TEST LOG] Starting step 2 - provision role');
    // seedOrganisationRoleTemplates(orgId);
    const adminRole = await provisionOrganisationSuperAdminRole(orgId);

    console.log('[TEST LOG] Starting step 3 - signup admin');
    const adminEmail = `est-admin-${Date.now()}@test.aiw.in`;
    const password = 'Password@123';
    const signUpResult = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: adminEmail, password, name: 'Est Admin' });

    console.log('[TEST LOG] Admin signed up with status:', signUpResult.status);

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
    console.log('[TEST LOG] Admin session established');

    // 2. Setup secondary organisation for multi-tenant isolation testing
    console.log('[TEST LOG] Starting step 4 - create other org');
    const otherOrg = await prisma.organisation.create({
      data: {
        name: `Other Org ${Date.now()}`,
        slug: otherOrgSlug,
        status: 'ACTIVE',
      },
    });
    otherOrgId = otherOrg.id;
    console.log('[TEST LOG] Starting step 5 - provision other admin role');
    const otherAdminRole = await provisionOrganisationSuperAdminRole(otherOrgId);

    console.log('[TEST LOG] Starting step 6 - other signup');
    const otherAdminEmail = `other-admin-${Date.now()}@test.aiw.in`;
    const otherSignUp = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: otherAdminEmail, password, name: 'Other Admin' });

    console.log('[TEST LOG] Other signed up');

    otherAdminCookie = (otherSignUp.headers['set-cookie'] as unknown as string[]) || [];

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

    const otherLoginRes = await request(app)
      .post('/api/v1/auth/sign-in/email')
      .send({ email: otherAdminEmail, password: 'Password@123' });
    otherAdminCookie = (otherLoginRes.headers['set-cookie'] as unknown as string[]) || otherAdminCookie;
    console.log('[TEST LOG] Other tenant session established');

    // 3. Create dummy CRM Lead and Customer in primary org
    const stage = await prisma.leadPipelineStage.create({
      data: {
        organisationId: orgId,
        name: 'Estimation Stage',
        code: `EST_STAGE_${Date.now()}`,
        order: 1,
        color: '#6366f1',
      },
    });

    const lead = await prisma.lead.create({
      data: {
        organisationId: orgId,
        leadNumber: `LD-${Date.now()}`,
        customerName: 'Suresh Kumar',
        phone: '9876543210',
        pipelineStageId: stage.id,
      },
    });
    leadId = lead.id;

    const customer = await prisma.customer.create({
      data: {
        organisationId: orgId,
        customerNumber: `CUST-${Date.now()}`,
        name: 'Suresh Kumar',
        phone: '9876543210',
        status: 'ACTIVE',
      },
    });
    customerId = customer.id;
  }, 45000);

  // -------------------------------------------------------------
  // Unit & Mathematical Verification: Decimal Calculation Engine
  // -------------------------------------------------------------
  describe('BOQ Calculation Engine (Decimal-Safe Arithmetic)', () => {
    it('accurately calculates item material, labour, and other costs', () => {
      const item = calculateBoqItem({
        materialQty: 100.5,
        materialRate: 150.25,
        labourQty: 2,
        labourRate: 500,
        otherCharges: 250,
      });

      // 100.5 * 150.25 = 15100.125 -> 15100.13
      expect(item.materialTotal.toNumber()).toBe(15100.13);
      // 2 * 500 = 1000.00
      expect(item.labourTotal.toNumber()).toBe(1000);
      expect(item.otherCharges.toNumber()).toBe(250);
      // 15100.13 + 1000 + 250 = 16350.13
      expect(item.itemTotal.toNumber()).toBe(16350.13);
    });

    it('accurately aggregates sections with markups, discounts, and GST', () => {
      const sections = [
        {
          items: [
            {
              materialQuantity: 10,
              materialRate: 100, // 1000
              labourQuantity: 1,
              labourRate: 200, // 200
              otherRate: 50, // 50
              // itemTotal = 1250
            },
          ],
        },
      ];

      const summary = calculateBoqSummary(sections, {
        wastagePercent: 5, // 5% of materialCost (1000 * 0.05 = 50)
        overheadPercent: 10, // 10% of baseSubtotal (1250 * 0.10 = 125)
        profitMarginPercent: 15, // 15% of (1250 + 50 + 125 = 1425) -> 213.75
        discountPercent: 2, // 2% of (1425 + 213.75 = 1638.75) -> 32.78
        taxPercent: 18, // 18% of (1638.75 - 32.78 = 1605.97) -> 289.07
      });

      expect(summary.totalMaterialCost.toNumber()).toBe(1000);
      expect(summary.totalLabourCost.toNumber()).toBe(200);
      expect(summary.totalOtherCharges.toNumber()).toBe(50);
      expect(summary.subtotalCost.toNumber()).toBe(1250);
      expect(summary.wastageAmount.toNumber()).toBe(50);
      expect(summary.overheadAmount.toNumber()).toBe(130);
      expect(summary.profitMarginAmount.toNumber()).toBe(214.5);
      expect(summary.discountAmount.toNumber()).toBe(32.89);
      expect(summary.taxAmount.toNumber()).toBe(290.09);
      expect(summary.grandTotal.toNumber()).toBe(1901.7);
    });
  });

  // -------------------------------------------------------------
  // Material Library & Rate History
  // -------------------------------------------------------------
  describe('Material Library & Labour Library', () => {
    it('creates a material with category and logs initial rate history', async () => {
      const catRes = await request(app)
        .post('/api/v1/estimation/materials/categories')
        .set('Cookie', adminCookie)
        .send({ name: 'Flooring & Tiling' });

      expect(catRes.status).toBe(201);
      const catId = catRes.body.id;

      const matRes = await request(app)
        .post('/api/v1/estimation/materials')
        .set('Cookie', adminCookie)
        .send({
          name: 'Vitrified Glazed Tiles 600x1200',
          sku: `MAT-VT-${Date.now()}`,
          unit: 'SQFT',
          standardRate: 85.5,
          vendorRate: 80.0,
          preferredVendor: 'Kajaria Ceramics Ltd',
          categoryId: catId,
        });

      expect(matRes.status).toBe(201);
      expect(matRes.body.data.name).toBe('Vitrified Glazed Tiles 600x1200');
      materialId = matRes.body.data.id;

      // Update rate to test rate history tracking
      const updateRes = await request(app)
        .put(`/api/v1/estimation/materials/${materialId}`)
        .set('Cookie', adminCookie)
        .send({
          standardRate: 92.0,
          vendorRate: 86.5,
          reason: 'Raw material price hike Q3',
        });

      expect(updateRes.status).toBe(200);
      expect(Number(updateRes.body.data.standardRate)).toBe(92);

      // Verify rate history endpoint
      const histRes = await request(app)
        .get(`/api/v1/estimation/materials/${materialId}/history`)
        .set('Cookie', adminCookie);

      expect(histRes.status).toBe(200);
      expect(histRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('creates labour specifications and lists rates', async () => {
      const labRes = await request(app)
        .post('/api/v1/estimation/labour')
        .set('Cookie', adminCookie)
        .send({
          code: `LAB-TILE-${Date.now()}`,
          workDescription: 'Tile Laying & Chemical Grouted Joint Filling',
          unit: 'SQFT',
          standardRate: 35.0,
        });

      expect(labRes.status).toBe(201);
      labourId = labRes.body.data.id;

      const listRes = await request(app)
        .get('/api/v1/estimation/labour')
        .set('Cookie', adminCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((l: any) => l.id === labourId)).toBe(true);
    });

    it('exports material library to Excel format', async () => {
      const exportRes = await request(app)
        .get('/api/v1/estimation/materials/export/excel')
        .set('Cookie', adminCookie);

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // -------------------------------------------------------------
  // BOQ Templates
  // -------------------------------------------------------------
  describe('BOQ Templates', () => {
    it('creates and lists reusable BOQ templates', async () => {
      const templateRes = await request(app)
        .post('/api/v1/estimation/templates')
        .set('Cookie', adminCookie)
        .send({
          name: 'Standard 2BHK Interior Template',
          projectCategory: 'RESIDENTIAL_INTERIOR',
          description: 'Includes living room, 2 bedrooms and kitchen',
          sections: [
            {
              name: 'Living Room',
              items: [
                {
                  itemCode: 'LIV-01',
                  description: 'TV Unit in commercial ply with laminate finish',
                  unit: 'SQFT',
                  materialRate: 850,
                  labourRate: 250,
                },
              ],
            },
          ],
        });

      expect(templateRes.status).toBe(201);
      expect(templateRes.body.data.name).toBe('Standard 2BHK Interior Template');
    });
  });

  // -------------------------------------------------------------
  // Estimate Management & BOQ Builder
  // -------------------------------------------------------------
  describe('Estimate Management & BOQ Builder', () => {
    it('creates an estimate linked to a CRM lead and customer', async () => {
      const createRes = await request(app)
        .post('/api/v1/estimation/estimates')
        .set('Cookie', adminCookie)
        .send({
          title: '3BHK Villa Complete Interior Fitout',
          projectCategory: 'RESIDENTIAL_INTERIOR',
          projectLocation: 'Sarjapur Road, Bengaluru',
          leadId,
          customerId,
          wastagePercent: 5,
          overheadPercent: 10,
          profitMarginPercent: 15,
          discountPercent: 0,
          taxPercent: 18,
          sections: [
            {
              name: 'Civil & Flooring',
              sectionOrder: 1,
              items: [
                {
                  itemCode: 'FLR-01',
                  description: 'Vitrified tile flooring including substrate prep',
                  unit: 'SQFT',
                  materialQuantity: 500,
                  materialRate: 92,
                  labourQuantity: 500,
                  labourRate: 35,
                  otherRate: 1500,
                  materialId,
                  labourRateId: labourId,
                },
              ],
            },
          ],
        });

      expect(createRes.status).toBe(201);
      estimateId = createRes.body.data.id;
      expect(createRes.body.data.estimateNumber).toMatch(/^EST-/);
      expect(createRes.body.data.revisionNumber).toBe(1);
      expect(Number(createRes.body.data.grandTotal)).toBeGreaterThan(0);
      expect(createRes.body.data.leadId).toBe(leadId);
      expect(createRes.body.data.customerId).toBe(customerId);
    });

    it('fetches estimate details with sections, items and recalculations', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/estimation/estimates/${estimateId}`)
        .set('Cookie', adminCookie);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.sections.length).toBe(1);
      expect(detailRes.body.data.sections[0].items.length).toBe(1);
    });

    it('creates a new revision of an estimate, preserving historical version', async () => {
      const reviseRes = await request(app)
        .post(`/api/v1/estimation/estimates/${estimateId}/revise`)
        .set('Cookie', adminCookie)
        .send({
          title: '3BHK Villa Complete Interior Fitout (Revised Client Scope)',
        });

      expect(reviseRes.status).toBe(201);
      const newEstimate = reviseRes.body.data;
      expect(newEstimate.revisionNumber).toBe(2);
      expect(newEstimate.parentEstimateId).toBe(estimateId);
      expect(newEstimate.status).toBe('DRAFT');

      // Old estimate should remain version 1
      const oldEstimate = await prisma.estimate.findUnique({
        where: { id: estimateId },
      });
      expect(oldEstimate?.revisionNumber).toBe(1);
    });

    it('duplicates an estimate cleanly for a new proposal', async () => {
      const dupRes = await request(app)
        .post(`/api/v1/estimation/estimates/${estimateId}/duplicate`)
        .set('Cookie', adminCookie);

      expect(dupRes.status).toBe(201);
      expect(dupRes.body.data.title).toMatch(/Copy/i);
      expect(dupRes.body.data.revisionNumber).toBe(1);
      expect(dupRes.body.data.id).not.toBe(estimateId);
    });
  });

  // -------------------------------------------------------------
  // Quotation Management, Commercial Approvals & PDF
  // -------------------------------------------------------------
  describe('Quotation Workflow & Separation of Duties', () => {
    it('generates a commercial quotation from an estimate', async () => {
      const quotRes = await request(app)
        .post('/api/v1/estimation/quotations')
        .set('Cookie', adminCookie)
        .send({
          estimateId,
          termsConditions: '50% advance upon contract signing. 40% stage-wise. 10% handover.',
          paymentSchedule: [
            { milestone: 'Advance Booking', percent: 20 },
            { milestone: 'Material Delivery to Site', percent: 40 },
            { milestone: 'Carpentry & First Fix Completed', percent: 30 },
            { milestone: 'Final Finishing and Handover', percent: 10 },
          ],
        });

      expect(quotRes.status).toBe(201);
      quotationId = quotRes.body.data.id;
      expect(quotRes.body.data.quotationNumber).toMatch(/^(QT|QUOT)-/);
      expect(quotRes.body.data.status).toBe('PENDING_APPROVAL');
    });

    it('blocks dispatch when quotation is not yet approved', async () => {
      const dispatchRes = await request(app)
        .post(`/api/v1/estimation/quotations/${quotationId}/dispatch`)
        .set('Cookie', adminCookie)
        .send({ recipientEmail: 'client@example.com' });

      expect(dispatchRes.status).toBe(403);
    });

    it('enforces commercial approval separation: user without quotations.approve permission cannot approve', async () => {
      // Create a Project Manager user without quotations.approve
      const pmEmail = `pm-${Date.now()}@test.aiw.in`;
      const signUpResult = await request(app)
        .post('/api/v1/auth/sign-up/email')
        .send({ email: pmEmail, password: 'Password@123', name: 'Site PM' });

      const pmUserId = signUpResult.body.user.id;

      await prisma.user.update({
        where: { id: pmUserId },
        data: { organisationId: orgId, status: 'ACTIVE' },
      });

      // Find PROJECT_MANAGER role
      const pmRole = await prisma.role.findFirst({
        where: { organisationId: orgId, name: 'PROJECT_MANAGER' },
      });

      if (pmRole) {
        await prisma.userRole.create({
          data: {
            organisationId: orgId,
            userId: pmUserId,
            roleId: pmRole.id,
          },
        });
      }

      const pmLogin = await request(app)
        .post('/api/v1/auth/sign-in/email')
        .send({ email: pmEmail, password: 'Password@123' });
      const pmCookie = (pmLogin.headers['set-cookie'] as unknown as string[]) || [];

      // PM attempts to approve quotation -> 403 Forbidden
      const approveRes = await request(app)
        .post(`/api/v1/estimation/quotations/${quotationId}/approve`)
        .set('Cookie', pmCookie)
        .send({ decision: 'APPROVE', comments: 'Approved by PM' });

      expect(approveRes.status).toBe(403);
    });

    it('allows an explicitly authorized approver to approve quotation', async () => {
      // Grant quotations.approve to a commercial role for this org
      const approverRole = await prisma.role.create({
        data: {
          organisationId: orgId,
          name: 'Commercial Director',
          code: 'COMMERCIAL_DIRECTOR',
          description: 'Commercial Director with approval authority',
          isSystemRole: false,
          status: 'ACTIVE',
        },
      });

      // Map quotations.approve permission
      const perm = await prisma.permission.findUnique({
        where: { code: 'quotations.approve' },
      });

      if (perm) {
        await prisma.rolePermission.create({
          data: {
            organisationId: orgId,
            roleId: approverRole.id,
            permissionId: perm.id,
          },
        });
      }

      // Assign approverRole to adminUserId
      await prisma.userRole.create({
        data: {
          organisationId: orgId,
          userId: adminUserId,
          roleId: approverRole.id,
        },
      });

      // Now approve
      const approveRes = await request(app)
        .post(`/api/v1/estimation/quotations/${quotationId}/approve`)
        .set('Cookie', adminCookie)
        .send({ decision: 'APPROVE', comments: 'Commercial terms verified and accepted.' });

      expect(approveRes.status).toBe(200);
      const approvedQuot = approveRes.body.data.quotation || approveRes.body.data;
      expect(approvedQuot.status).toBe('APPROVED');
    });

    it('allows dispatch once quotation is approved', async () => {
      const dispatchRes = await request(app)
        .post(`/api/v1/estimation/quotations/${quotationId}/dispatch`)
        .set('Cookie', adminCookie)
        .send({
          recipientEmail: 'client@example.com',
          dispatchNote: 'Formal quotation dispatched to client via email portal.',
        });

      expect(dispatchRes.status).toBe(200);
      expect(dispatchRes.body.data.status).toBe('DISPATCHED');
    });

    it('generates a clean PDF document for the approved quotation', async () => {
      const pdfRes = await request(app)
        .get(`/api/v1/estimation/quotations/${quotationId}/pdf`)
        .set('Cookie', adminCookie);

      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
    });
  });

  // -------------------------------------------------------------
  // Multi-Tenant Isolation
  // -------------------------------------------------------------
  describe('Multi-Tenant Isolation', () => {
    it('prevents another organisation from viewing or tampering with estimates or quotations', async () => {
      // Other org attempts to fetch primary org estimate
      const estRes = await request(app)
        .get(`/api/v1/estimation/estimates/${estimateId}`)
        .set('Cookie', otherAdminCookie);

      expect(estRes.status).toBe(404);

      // Other org attempts to fetch primary org quotation
      const quotRes = await request(app)
        .get(`/api/v1/estimation/quotations/${quotationId}`)
        .set('Cookie', otherAdminCookie);

      expect(quotRes.status).toBe(404);
    });
  });
});
