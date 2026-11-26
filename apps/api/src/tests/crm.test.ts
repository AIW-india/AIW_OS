import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../database/prisma.js';
import { provisionOrganisationSuperAdminRole } from '../common/rbac/permissions-catalog.js';

describe('AIW OS — Phase 1: CRM Integration & Security Tests', () => {
  const app = createApp();

  const orgSlug = `crm-corp-${Date.now()}`;
  let orgId: string;
  let adminUserId: string;
  let adminCookie: string[];

  const otherOrgSlug = `crm-other-${Date.now()}`;
  let otherOrgId: string;
  let otherAdminUserId: string;
  let otherAdminCookie: string[];

  let testStageId: string;
  let wonStageId: string;
  let lostStageId: string;
  let testSourceId: string;
  let testLeadId: string;

  beforeAll(async () => {
    // 1. Create primary test organisation
    const org = await prisma.organisation.create({
      data: {
        name: `CRM Test Construction ${Date.now()}`,
        slug: orgSlug,
        status: 'ACTIVE',
      },
    });
    orgId = org.id;

    // Provision admin role
    const adminRole = await provisionOrganisationSuperAdminRole(orgId);

    // Create admin user via Better Auth
    const adminEmail = `crm-admin-${Date.now()}@test.aiw.in`;
    const password = 'Password@123';
    const signUpResult = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: adminEmail, password, name: 'CRM Admin' });

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

    const signInRes = await request(app)
      .post('/api/v1/auth/sign-in/email')
      .send({ email: adminEmail, password });
    adminCookie = (signInRes.headers['set-cookie'] as unknown as string[]) || [];

    // 2. Create secondary tenant organisation for cross-tenant testing
    const otherOrg = await prisma.organisation.create({
      data: {
        name: `Other Tenant Interiors ${Date.now()}`,
        slug: otherOrgSlug,
        status: 'ACTIVE',
      },
    });
    otherOrgId = otherOrg.id;
    const otherAdminRole = await provisionOrganisationSuperAdminRole(otherOrgId);

    const otherEmail = `other-admin-${Date.now()}@test.aiw.in`;
    const otherSignUpRes = await request(app)
      .post('/api/v1/auth/sign-up/email')
      .send({ email: otherEmail, password, name: 'Other Admin' });
    otherAdminUserId = otherSignUpRes.body.user.id;

    await prisma.user.update({
      where: { id: otherAdminUserId },
      data: { organisationId: otherOrgId, status: 'ACTIVE' },
    });
    await prisma.userRole.create({
      data: {
        organisationId: otherOrgId,
        userId: otherAdminUserId,
        roleId: otherAdminRole.id,
      },
    });

    const otherSignInRes = await request(app)
      .post('/api/v1/auth/sign-in/email')
      .send({ email: otherEmail, password });
    otherAdminCookie = (otherSignInRes.headers['set-cookie'] as unknown as string[]) || [];
  }, 90000);

  afterAll(async () => {
    // Clean up test data
    try {
      if (orgId) {
        await prisma.leadActivity.deleteMany({ where: { organisationId: orgId } });
        await prisma.followUp.deleteMany({ where: { organisationId: orgId } });
        await prisma.siteVisit.deleteMany({ where: { organisationId: orgId } });
        await prisma.leadAssignment.deleteMany({ where: { lead: { organisationId: orgId } } });
        await prisma.leadStageHistory.deleteMany({ where: { lead: { organisationId: orgId } } });
        await prisma.customerContact.deleteMany({ where: { customer: { organisationId: orgId } } });
        await prisma.customerAddress.deleteMany({ where: { customer: { organisationId: orgId } } });
        await prisma.customerNote.deleteMany({ where: { customer: { organisationId: orgId } } });
        await prisma.customer.deleteMany({ where: { organisationId: orgId } });
        await prisma.lead.deleteMany({ where: { organisationId: orgId } });
        await prisma.leadPipelineStage.deleteMany({ where: { organisationId: orgId } });
        await prisma.leadSource.deleteMany({ where: { organisationId: orgId } });
        await prisma.lostReasonCategory.deleteMany({ where: { organisationId: orgId } });
        await prisma.userRole.deleteMany({ where: { organisationId: orgId } });
        await prisma.rolePermission.deleteMany({ where: { organisationId: orgId } });
        await prisma.role.deleteMany({ where: { organisationId: orgId } });
        await prisma.session.deleteMany({ where: { userId: adminUserId } });
        await prisma.account.deleteMany({ where: { userId: adminUserId } });
        await prisma.user.deleteMany({ where: { organisationId: orgId } });
        await prisma.organisation.deleteMany({ where: { id: orgId } });
      }

      if (otherOrgId) {
        await prisma.userRole.deleteMany({ where: { organisationId: otherOrgId } });
        await prisma.rolePermission.deleteMany({ where: { organisationId: otherOrgId } });
        await prisma.role.deleteMany({ where: { organisationId: otherOrgId } });
        await prisma.session.deleteMany({ where: { userId: otherAdminUserId } });
        await prisma.account.deleteMany({ where: { userId: otherAdminUserId } });
        await prisma.user.deleteMany({ where: { organisationId: otherOrgId } });
        await prisma.organisation.deleteMany({ where: { id: otherOrgId } });
      }
    } catch (e) {
      // Ignore teardown errors
    }
  }, 90000);

  it('1. Pipeline Config: Creates configurable pipeline stages and sources', async () => {
    // Create stages
    const stageRes = await request(app)
      .post('/api/v1/crm/pipeline-stages')
      .set('Cookie', adminCookie)
      .send({
        name: 'New Enquiry',
        code: 'NEW_ENQUIRY',
        order: 1,
        isTerminal: false,
        color: '#3b82f6',
      });
    expect(stageRes.status).toBe(201);
    testStageId = stageRes.body.data.id;

    const wonStageRes = await request(app)
      .post('/api/v1/crm/pipeline-stages')
      .set('Cookie', adminCookie)
      .send({
        name: 'Won',
        code: 'WON',
        order: 9,
        isTerminal: true,
        color: '#10b981',
      });
    expect(wonStageRes.status).toBe(201);
    wonStageId = wonStageRes.body.data.id;

    const lostStageRes = await request(app)
      .post('/api/v1/crm/pipeline-stages')
      .set('Cookie', adminCookie)
      .send({
        name: 'Lost',
        code: 'LOST',
        order: 10,
        isTerminal: true,
        color: '#ef4444',
      });
    expect(lostStageRes.status).toBe(201);
    lostStageId = lostStageRes.body.data.id;

    // Create lead source
    const sourceRes = await request(app)
      .post('/api/v1/crm/lead-sources')
      .set('Cookie', adminCookie)
      .send({
        name: 'Instagram Ads',
        code: 'INSTAGRAM_ADS',
        description: 'Inbound campaigns',
      });
    expect(sourceRes.status).toBe(201);
    testSourceId = sourceRes.body.data.id;
  });

  it('2. Lead Management: Creates lead and verifies duplicate detection', async () => {
    const leadPayload = {
      customerName: 'Ananya Sharma',
      phone: '+91 9988776655',
      email: 'ananya@example.com',
      location: 'Whitefield, Bengaluru',
      propertyType: 'RESIDENTIAL_APARTMENT',
      projectCategory: 'INTERIOR_DESIGN',
      estimatedBudget: 2500000,
      priority: 'HIGH',
      sourceId: testSourceId,
      pipelineStageId: testStageId,
    };

    // Create lead
    const res = await request(app)
      .post('/api/v1/crm/leads')
      .set('Cookie', adminCookie)
      .send(leadPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.leadNumber).toMatch(/^LD-\d{5}$/);
    expect(res.body.data.customerName).toBe('Ananya Sharma');
    testLeadId = res.body.data.id;

    // Duplicate detection should reject identical phone + customer name
    const dupRes = await request(app)
      .post('/api/v1/crm/leads')
      .set('Cookie', adminCookie)
      .send(leadPayload);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_LEAD');
  });

  it('3. Lead Assignment: Reassigns lead and records history & activity timeline', async () => {
    const assignRes = await request(app)
      .post(`/api/v1/crm/leads/${testLeadId}/assign`)
      .set('Cookie', adminCookie)
      .send({
        assignedUserId: adminUserId,
        remarks: 'Assigned to senior consultant',
      });
    expect(assignRes.status).toBe(200);

    // Verify activity timeline has entries
    const actRes = await request(app)
      .get(`/api/v1/crm/leads/${testLeadId}/activities`)
      .set('Cookie', adminCookie);
    expect(actRes.status).toBe(200);
    expect(actRes.body.data.length).toBeGreaterThanOrEqual(2); // CREATED, ASSIGNED
  });

  it('4. Follow-up & Site Visit Scheduling', async () => {
    // Schedule follow-up
    const fRes = await request(app)
      .post('/api/v1/crm/follow-ups')
      .set('Cookie', adminCookie)
      .send({
        leadId: testLeadId,
        type: 'CALL',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Review modular kitchen estimates',
      });
    expect(fRes.status).toBe(201);
    const followUpId = fRes.body.data.id;

    // Complete follow-up
    const completeRes = await request(app)
      .post(`/api/v1/crm/follow-ups/${followUpId}/complete`)
      .set('Cookie', adminCookie)
      .send({ outcome: 'Client agreed to site inspection' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');

    // Schedule site visit
    const vRes = await request(app)
      .post('/api/v1/crm/site-visits')
      .set('Cookie', adminCookie)
      .send({
        leadId: testLeadId,
        visitDate: new Date(Date.now() + 172800000).toISOString(),
        address: 'Tower B, Flat 402, Whitefield',
        remarks: 'Floor measurement',
      });
    expect(vRes.status).toBe(201);
    expect(vRes.body.data.status).toBe('SCHEDULED');
  });

  it('5. Controlled Customer Conversion: Converts lead and creates customer', async () => {
    const convRes = await request(app)
      .post(`/api/v1/crm/leads/${testLeadId}/convert`)
      .set('Cookie', adminCookie);
    expect(convRes.status).toBe(201);
    expect(convRes.body.data.customer.customerNumber).toMatch(/^CUST-\d{5}$/);
    expect(convRes.body.data.lead.status).toBe('WON');

    const customerId = convRes.body.data.customer.id;

    // Add contact to customer
    const contactRes = await request(app)
      .post(`/api/v1/crm/customers/${customerId}/contacts`)
      .set('Cookie', adminCookie)
      .send({
        name: 'Sameer Sharma',
        phone: '+91 9988776654',
        role: 'Co-owner',
        isPrimary: false,
      });
    expect(contactRes.status).toBe(201);

    // Add address to customer
    const addrRes = await request(app)
      .post(`/api/v1/crm/customers/${customerId}/addresses`)
      .set('Cookie', adminCookie)
      .send({
        type: 'SITE',
        line1: 'Flat 402, Tower B, Prestige Palms',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066',
        isPrimary: true,
      });
    expect(addrRes.status).toBe(201);

    // Verify customer details
    const custDetailRes = await request(app)
      .get(`/api/v1/crm/customers/${customerId}`)
      .set('Cookie', adminCookie);
    expect(custDetailRes.status).toBe(200);
    expect(custDetailRes.body.data.contacts.length).toBe(1);
    expect(custDetailRes.body.data.addresses.length).toBe(1);
    expect(custDetailRes.body.data.convertedFromLead.leadNumber).toBeDefined();
  });

  it('6. Tenant Isolation: Rejects cross-tenant access on CRM entities', async () => {
    // Other tenant attempts to read primary tenant's lead
    const getRes = await request(app)
      .get(`/api/v1/crm/leads/${testLeadId}`)
      .set('Cookie', otherAdminCookie);
    expect(getRes.status).toBe(404); // Scoped to tenant, so returns not found

    // Other tenant attempts to modify primary tenant's lead
    const updateRes = await request(app)
      .patch(`/api/v1/crm/leads/${testLeadId}`)
      .set('Cookie', otherAdminCookie)
      .send({ customerName: 'Hacked Name' });
    expect(updateRes.status).toBe(404);
  });

  it('7. CRM Dashboard: Calculates aggregate metrics accurately', async () => {
    const dashRes = await request(app)
      .get('/api/v1/crm/dashboard')
      .set('Cookie', adminCookie);
    expect(dashRes.status).toBe(200);
    const summary = dashRes.body.data.summary;
    expect(summary.totalLeads).toBeGreaterThanOrEqual(1);
    expect(summary.wonLeads).toBeGreaterThanOrEqual(1);
    expect(summary.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(summary.conversionRate).toBeGreaterThan(0);
  });
});
