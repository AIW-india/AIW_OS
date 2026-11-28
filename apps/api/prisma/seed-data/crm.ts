import { prisma } from '../../src/database/prisma.js';
import type { SeedOrgContext } from './organisation.js';
import type { SeedEmployeesResult } from './employees.js';

export interface SeedCrmResult {
  leadIds: string[];
  customerIds: string[];
  leadsByCode: Record<string, string>;
  customersByCode: Record<string, string>;
}

const LEAD_SOURCES = ['Referral', 'Website', 'Social Media', 'Direct Enquiry', 'Advertisement'];

const PIPELINE_STAGES = [
  { name: 'New Enquiry', order: 1, isTerminal: false },
  { name: 'Contacted', order: 2, isTerminal: false },
  { name: 'Site Visit Scheduled', order: 3, isTerminal: false },
  { name: 'Proposal / BOQ Sent', order: 4, isTerminal: false },
  { name: 'Negotiation', order: 5, isTerminal: false },
  { name: 'Won', order: 6, isTerminal: true },
  { name: 'Lost', order: 7, isTerminal: true },
];

const LOST_REASONS = ['Budget Constraints', 'Competitor Selected', 'Project Postponed', 'Timeline Mismatch'];

interface DemoLeadSpec {
  leadNumber: string;
  fullName: string;
  phone: string;
  email: string;
  location: string;
  propertyType: 'RESIDENTIAL_APARTMENT' | 'RESIDENTIAL_VILLA' | 'COMMERCIAL_OFFICE' | 'RETAIL_SHOWROOM' | 'INDEPENDENT_PLOT';
  projectCategory: 'INTERIOR_DESIGN' | 'RESIDENTIAL_CONSTRUCTION' | 'COMMERCIAL_FITOUT' | 'RENOVATION' | 'TURNKEY';
  estimatedBudget: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'WON' | 'LOST';
  stageName: string;
  sourceName: string;
  convertToCustomerCode?: string;
  lostReasonName?: string;
}

const DEMO_LEADS: DemoLeadSpec[] = [
  // 8 Converted Leads -> 8 Customers
  { leadNumber: 'LD-DEMO-001', fullName: 'Aaravind Narayan', phone: '+91 98450 11001', email: 'aaravind.narayan@example.com', location: 'Whitefield, Bengaluru', propertyType: 'RESIDENTIAL_VILLA', projectCategory: 'INTERIOR_DESIGN', estimatedBudget: 2800000, priority: 'HIGH', status: 'WON', stageName: 'Won', sourceName: 'Referral', convertToCustomerCode: 'CUST-DEMO-001' },
  { leadNumber: 'LD-DEMO-002', fullName: 'Priya Subramanian', phone: '+91 98450 11002', email: 'priya.sub@example.com', location: 'Indiranagar, Bengaluru', propertyType: 'COMMERCIAL_OFFICE', projectCategory: 'COMMERCIAL_FITOUT', estimatedBudget: 5400000, priority: 'URGENT', status: 'WON', stageName: 'Won', sourceName: 'Website', convertToCustomerCode: 'CUST-DEMO-002' },
  { leadNumber: 'LD-DEMO-003', fullName: 'Vikramjit Singhania', phone: '+91 98450 11003', email: 'vikramjit.s@example.com', location: 'Hebbal, Bengaluru', propertyType: 'INDEPENDENT_PLOT', projectCategory: 'RESIDENTIAL_CONSTRUCTION', estimatedBudget: 12500000, priority: 'HIGH', status: 'WON', stageName: 'Won', sourceName: 'Direct Enquiry', convertToCustomerCode: 'CUST-DEMO-003' },
  { leadNumber: 'LD-DEMO-004', fullName: 'Nandini Rajagopal', phone: '+91 98450 11004', email: 'nandini.r@example.com', location: 'HSR Layout, Bengaluru', propertyType: 'RESIDENTIAL_APARTMENT', projectCategory: 'RENOVATION', estimatedBudget: 1650000, priority: 'MEDIUM', status: 'WON', stageName: 'Won', sourceName: 'Social Media', convertToCustomerCode: 'CUST-DEMO-004' },
  { leadNumber: 'LD-DEMO-005', fullName: 'Rohan Malhotra', phone: '+91 98450 11005', email: 'rohan.malhotra@example.com', location: 'Sarjapur Road, Bengaluru', propertyType: 'COMMERCIAL_OFFICE', projectCategory: 'RENOVATION', estimatedBudget: 3800000, priority: 'HIGH', status: 'WON', stageName: 'Won', sourceName: 'Referral', convertToCustomerCode: 'CUST-DEMO-005' },
  { leadNumber: 'LD-DEMO-006', fullName: 'Shruti Deshpande', phone: '+91 98450 11006', email: 'shruti.d@example.com', location: 'Yelahanka, Bengaluru', propertyType: 'RESIDENTIAL_VILLA', projectCategory: 'TURNKEY', estimatedBudget: 14200000, priority: 'URGENT', status: 'WON', stageName: 'Won', sourceName: 'Advertisement', convertToCustomerCode: 'CUST-DEMO-006' },
  { leadNumber: 'LD-DEMO-007', fullName: 'Karthikeya Murthy', phone: '+91 98450 11007', email: 'karthikeya.m@example.com', location: 'Electronic City, Bengaluru', propertyType: 'RESIDENTIAL_APARTMENT', projectCategory: 'INTERIOR_DESIGN', estimatedBudget: 1950000, priority: 'MEDIUM', status: 'WON', stageName: 'Won', sourceName: 'Website', convertToCustomerCode: 'CUST-DEMO-007' },
  { leadNumber: 'LD-DEMO-008', fullName: 'Anjali Venkataraman', phone: '+91 98450 11008', email: 'anjali.v@example.com', location: 'Whitefield, Bengaluru', propertyType: 'RETAIL_SHOWROOM', projectCategory: 'COMMERCIAL_FITOUT', estimatedBudget: 4100000, priority: 'HIGH', status: 'WON', stageName: 'Won', sourceName: 'Direct Enquiry', convertToCustomerCode: 'CUST-DEMO-008' },

  // 3 Open Leads
  { leadNumber: 'LD-DEMO-009', fullName: 'Sandeep Kulkarni', phone: '+91 98450 11009', email: 'sandeep.k@example.com', location: 'Sarjapur Road, Bengaluru', propertyType: 'RESIDENTIAL_VILLA', projectCategory: 'INTERIOR_DESIGN', estimatedBudget: 3200000, priority: 'HIGH', status: 'OPEN', stageName: 'Proposal / BOQ Sent', sourceName: 'Referral' },
  { leadNumber: 'LD-DEMO-010', fullName: 'Meenakshi Sundaram', phone: '+91 98450 11010', email: 'meenakshi.s@example.com', location: 'Indiranagar, Bengaluru', propertyType: 'RESIDENTIAL_APARTMENT', projectCategory: 'RENOVATION', estimatedBudget: 1250000, priority: 'MEDIUM', status: 'OPEN', stageName: 'Site Visit Scheduled', sourceName: 'Social Media' },
  { leadNumber: 'LD-DEMO-011', fullName: 'Harsha Vardhan', phone: '+91 98450 11011', email: 'harsha.v@example.com', location: 'Hebbal, Bengaluru', propertyType: 'INDEPENDENT_PLOT', projectCategory: 'TURNKEY', estimatedBudget: 9500000, priority: 'URGENT', status: 'OPEN', stageName: 'Negotiation', sourceName: 'Website' },

  // 4 Lost Leads
  { leadNumber: 'LD-DEMO-012', fullName: 'Gaurav Bansal', phone: '+91 98450 11012', email: 'gaurav.b@example.com', location: 'Electronic City, Bengaluru', propertyType: 'RESIDENTIAL_APARTMENT', projectCategory: 'INTERIOR_DESIGN', estimatedBudget: 900000, priority: 'LOW', status: 'LOST', stageName: 'Lost', sourceName: 'Advertisement', lostReasonName: 'Budget Constraints' },
  { leadNumber: 'LD-DEMO-013', fullName: 'Pooja Hegde-Rao', phone: '+91 98450 11013', email: 'pooja.hr@example.com', location: 'HSR Layout, Bengaluru', propertyType: 'COMMERCIAL_OFFICE', projectCategory: 'COMMERCIAL_FITOUT', estimatedBudget: 2400000, priority: 'MEDIUM', status: 'LOST', stageName: 'Lost', sourceName: 'Website', lostReasonName: 'Competitor Selected' },
  { leadNumber: 'LD-DEMO-014', fullName: 'Nitin Kamath', phone: '+91 98450 11014', email: 'nitin.k@example.com', location: 'Yelahanka, Bengaluru', propertyType: 'INDEPENDENT_PLOT', projectCategory: 'RESIDENTIAL_CONSTRUCTION', estimatedBudget: 8500000, priority: 'LOW', status: 'LOST', stageName: 'Lost', sourceName: 'Direct Enquiry', lostReasonName: 'Project Postponed' },
  { leadNumber: 'LD-DEMO-015', fullName: 'Divya Chandrasekhar', phone: '+91 98450 11015', email: 'divya.c@example.com', location: 'Whitefield, Bengaluru', propertyType: 'RESIDENTIAL_VILLA', projectCategory: 'RENOVATION', estimatedBudget: 2100000, priority: 'MEDIUM', status: 'LOST', stageName: 'Lost', sourceName: 'Social Media', lostReasonName: 'Timeline Mismatch' },
];

export async function seedCrmData(
  ctx: SeedOrgContext,
  employees: SeedEmployeesResult,
): Promise<SeedCrmResult> {
  const orgId = ctx.organisationId;
  const pms = employees.byRole['PROJECT_MANAGER'] || [ctx.superAdminUserId];
  const siteEngs = employees.byRole['SITE_ENGINEER'] || [ctx.superAdminUserId];

  // 1. Lead Sources
  const sourceMap: Record<string, string> = {};
  for (const name of LEAD_SOURCES) {
    let src = await prisma.leadSource.findFirst({ where: { organisationId: orgId, name } });
    if (!src) {
      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      src = await prisma.leadSource.create({ data: { organisationId: orgId, name, code, isActive: true } });
    }
    sourceMap[name] = src.id;
  }

  // 2. Pipeline Stages
  const stageMap: Record<string, string> = {};
  for (const st of PIPELINE_STAGES) {
    let stage = await prisma.leadPipelineStage.findFirst({
      where: { organisationId: orgId, name: st.name },
    });
    if (!stage) {
      const code = st.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      stage = await prisma.leadPipelineStage.create({
        data: { organisationId: orgId, code, ...st },
      });
    }
    stageMap[st.name] = stage.id;
  }

  // 3. Lost Reasons
  const lostMap: Record<string, string> = {};
  for (const reason of LOST_REASONS) {
    let lr = await prisma.lostReasonCategory.findFirst({ where: { organisationId: orgId, name: reason } });
    if (!lr) {
      const code = reason.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      lr = await prisma.lostReasonCategory.create({ data: { organisationId: orgId, name: reason, code, isActive: true } });
    }
    lostMap[reason] = lr.id;
  }

  // 4. Leads & Customers
  const leadIds: string[] = [];
  const customerIds: string[] = [];
  const leadsByCode: Record<string, string> = {};
  const customersByCode: Record<string, string> = {};

  for (let i = 0; i < DEMO_LEADS.length; i++) {
    const spec = DEMO_LEADS[i];
    const assignedUserId = pms[i % pms.length];

    let customerId: string | null = null;
    if (spec.convertToCustomerCode) {
      let customer = await prisma.customer.findFirst({
        where: { organisationId: orgId, customerNumber: spec.convertToCustomerCode },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            organisationId: orgId,
            customerNumber: spec.convertToCustomerCode,
            type: 'INDIVIDUAL',
            name: spec.fullName,
            phone: spec.phone,
            email: spec.email,
            billingAddress: spec.location,
            status: 'ACTIVE',
            createdByUserId: ctx.superAdminUserId,
          },
        });
      }
      customerId = customer.id;
      customerIds.push(customer.id);
      customersByCode[spec.convertToCustomerCode] = customer.id;
    }

    let lead = await prisma.lead.findFirst({
      where: { organisationId: orgId, leadNumber: spec.leadNumber },
    });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organisationId: orgId,
          leadNumber: spec.leadNumber,
          customerName: spec.fullName,
          phone: spec.phone,
          email: spec.email,
          location: spec.location,
          propertyType: spec.propertyType,
          projectCategory: spec.projectCategory,
          estimatedBudget: spec.estimatedBudget,
          priority: spec.priority,
          status: spec.status,
          pipelineStageId: stageMap[spec.stageName],
          sourceId: sourceMap[spec.sourceName],
          lostReasonId: spec.lostReasonName ? lostMap[spec.lostReasonName] : null,
          assignedUserId,
          createdByUserId: ctx.superAdminUserId,
        },
      });
    }
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { convertedFromLeadId: lead.id },
      });
    }
    leadIds.push(lead.id);
    leadsByCode[spec.leadNumber] = lead.id;
  }

  // 5. Follow-ups (5)
  const followUpSpecs = [
    { leadCode: 'LD-DEMO-009', type: 'CALL' as const, status: 'PENDING' as const, daysOffset: 1, notes: 'Discuss revised BOQ pricing with Sandeep' },
    { leadCode: 'LD-DEMO-010', type: 'MEETING' as const, status: 'PENDING' as const, daysOffset: 2, notes: 'Confirm site measurement slot in Indiranagar' },
    { leadCode: 'LD-DEMO-011', type: 'WHATSAPP' as const, status: 'PENDING' as const, daysOffset: 0, notes: 'Share turnkey timeline & payment schedule' },
    { leadCode: 'LD-DEMO-001', type: 'CALL' as const, status: 'COMPLETED' as const, daysOffset: -10, notes: 'Initial scope & budget alignment completed' },
    { leadCode: 'LD-DEMO-002', type: 'EMAIL' as const, status: 'COMPLETED' as const, daysOffset: -7, notes: 'Sent commercial fitout proposal' },
  ];

  for (let i = 0; i < followUpSpecs.length; i++) {
    const f = followUpSpecs[i];
    const leadId = leadsByCode[f.leadCode];
    if (!leadId) continue;
    const existing = await prisma.followUp.findFirst({
      where: { organisationId: orgId, leadId, notes: f.notes },
    });
    if (!existing) {
      await prisma.followUp.create({
        data: {
          organisationId: orgId,
          leadId,
          assignedUserId: pms[i % pms.length],
          type: f.type,
          scheduledAt: new Date(Date.now() + f.daysOffset * 86400000),
          status: f.status,
          notes: f.notes,
        },
      });
    }
  }

  // 6. Site Visits (4)
  const siteVisitSpecs = [
    { leadCode: 'LD-DEMO-010', status: 'SCHEDULED' as const, daysOffset: 2, address: '12th Main, Indiranagar, Bengaluru', notes: 'Apartment renovation measurement & structural check' },
    { leadCode: 'LD-DEMO-011', status: 'SCHEDULED' as const, daysOffset: 3, address: 'Plot 42, Hebbal, Bengaluru', notes: 'Soil & plot boundary inspection for turnkey villa' },
    { leadCode: 'LD-DEMO-001', status: 'COMPLETED' as const, daysOffset: -18, address: 'Palm Meadows, Whitefield, Bengaluru', notes: 'Completed villa interior laser measurements' },
    { leadCode: 'LD-DEMO-003', status: 'COMPLETED' as const, daysOffset: -20, address: 'Dollars Colony, Hebbal, Bengaluru', notes: 'Completed plot survey and setback verification' },
  ];

  for (let i = 0; i < siteVisitSpecs.length; i++) {
    const sv = siteVisitSpecs[i];
    const leadId = leadsByCode[sv.leadCode];
    if (!leadId) continue;
    const existing = await prisma.siteVisit.findFirst({
      where: { organisationId: orgId, leadId, address: sv.address },
    });
    if (!existing) {
      await prisma.siteVisit.create({
        data: {
          organisationId: orgId,
          leadId,
          assignedUserId: siteEngs[i % siteEngs.length],
          visitDate: new Date(Date.now() + sv.daysOffset * 86400000),
          status: sv.status,
          address: sv.address,
          remarks: sv.notes,
        },
      });
    }
  }

  return { leadIds, customerIds, leadsByCode, customersByCode };
}
