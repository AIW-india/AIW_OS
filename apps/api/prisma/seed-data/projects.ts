import { prisma } from '../../src/database/prisma.js';
import type { SeedOrgContext } from './organisation.js';
import type { SeedEmployeesResult } from './employees.js';
import type { SeedCrmResult } from './crm.js';
import type { SeedQuotationsResult } from './quotations.js';

export interface SeedProjectsResult {
  projectsByCode: Record<string, string>;
}

export async function seedProjectsData(
  ctx: SeedOrgContext,
  employees: SeedEmployeesResult,
  crm: SeedCrmResult,
  quotations: SeedQuotationsResult,
): Promise<SeedProjectsResult> {
  const orgId = ctx.organisationId;
  const pms = employees.byRole['PROJECT_MANAGER'] || [ctx.superAdminUserId];
  const siteEngs = employees.byRole['SITE_ENGINEER'] || [ctx.superAdminUserId];
  const archs = employees.byRole['ARCHITECT_INTERIOR_DESIGNER'] || [ctx.superAdminUserId];

  const specs = [
    {
      projectNumber: 'PRJ-DEMO-001',
      name: 'Luxury Villa Interior — Whitefield',
      customerCode: 'CUST-DEMO-001',
      quotationCode: 'QT-DEMO-001',
      category: 'RESIDENTIAL_INTERIOR' as const,
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      siteAddress: 'Palm Meadows, Whitefield, Bengaluru',
      description: 'Complete luxury interior execution for 4BHK villa including modular kitchen, wardrobes, false ceiling & lighting.',
      pmIndex: 0,
      progressPercentage: 45,
      budget: 2800000,
      startDaysOffset: -30,
      endDaysOffset: 60,
    },
    {
      projectNumber: 'PRJ-DEMO-002',
      name: 'Commercial Office Fitout — Indiranagar',
      customerCode: 'CUST-DEMO-002',
      quotationCode: 'QT-DEMO-002',
      category: 'COMMERCIAL_INTERIOR' as const,
      status: 'IN_PROGRESS' as const,
      priority: 'URGENT' as const,
      siteAddress: '100 Feet Road, Indiranagar, Bengaluru',
      description: '5,000 sq.ft corporate office fitout with acoustic partitions, conference rooms, and MEP.',
      pmIndex: 1,
      progressPercentage: 30,
      budget: 5400000,
      startDaysOffset: -20,
      endDaysOffset: 75,
    },
    {
      projectNumber: 'PRJ-DEMO-003',
      name: 'Residential Building Construction — Hebbal',
      customerCode: 'CUST-DEMO-003',
      quotationCode: null,
      category: 'RESIDENTIAL_CONSTRUCTION' as const,
      status: 'NOT_STARTED' as const,
      priority: 'HIGH' as const,
      siteAddress: 'Dollars Colony, Hebbal, Bengaluru',
      description: 'G+2 independent residential building construction. Awaiting Project Manager assignment.',
      pmIndex: null, // Intentionally unassigned for testing PM assignment workflow
      progressPercentage: 0,
      budget: 12500000,
      startDaysOffset: 5,
      endDaysOffset: 240,
    },
    {
      projectNumber: 'PRJ-DEMO-004',
      name: 'Apartment Renovation — HSR Layout',
      customerCode: 'CUST-DEMO-004',
      quotationCode: null,
      category: 'RENOVATION' as const,
      status: 'COMPLETED' as const,
      priority: 'MEDIUM' as const,
      siteAddress: 'Sector 2, HSR Layout, Bengaluru',
      description: 'Full 3BHK apartment renovation including wooden flooring, kitchen remodel, and painting.',
      pmIndex: 2,
      progressPercentage: 100,
      budget: 1650000,
      startDaysOffset: -90,
      endDaysOffset: -5,
    },
    {
      projectNumber: 'PRJ-DEMO-005',
      name: 'Corporate Office Renovation — Sarjapur Road',
      customerCode: 'CUST-DEMO-005',
      quotationCode: null,
      category: 'COMMERCIAL_INTERIOR' as const,
      status: 'ON_HOLD' as const,
      priority: 'MEDIUM' as const,
      siteAddress: 'Sarjapur Outer Ring Road, Bengaluru',
      description: 'Office floor refurbishment on hold pending client HVAC vendor clearance.',
      pmIndex: 0,
      progressPercentage: 20,
      budget: 3800000,
      startDaysOffset: -40,
      endDaysOffset: 50,
    },
    {
      projectNumber: 'PRJ-DEMO-006',
      name: 'Premium Villa Turnkey — Yelahanka',
      customerCode: 'CUST-DEMO-006',
      quotationCode: null,
      category: 'TURNKEY' as const,
      status: 'DELAYED' as const,
      priority: 'URGENT' as const,
      siteAddress: 'Yelahanka New Town, Bengaluru',
      description: 'End-to-end turnkey villa project experiencing minor material procurement delay.',
      pmIndex: 1,
      progressPercentage: 55,
      budget: 14200000,
      startDaysOffset: -75,
      endDaysOffset: 30,
    },
  ];

  const projectsByCode: Record<string, string> = {};

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    let project = await prisma.project.findFirst({
      where: { organisationId: orgId, projectNumber: s.projectNumber },
    });

    if (!project) {
      const qt = s.quotationCode ? quotations.quotationsByCode[s.quotationCode] : null;
      const pmId = s.pmIndex !== null ? pms[s.pmIndex % pms.length] : null;

      project = await prisma.project.create({
        data: {
          organisationId: orgId,
          projectNumber: s.projectNumber,
          name: s.name,
          customerId: crm.customersByCode[s.customerCode],
          projectCategory: s.category,
          siteAddress: s.siteAddress,
          description: s.description,
          status: s.status,
          priority: s.priority,
          projectManagerId: pmId,
          sourceQuotationId: qt?.id ?? null,
          sourceQuotationNumber: qt?.quotationNumber ?? null,
          sourceQuotationRevision: qt?.revisionNumber ?? null,
          budgetBaselineAmount: qt ? qt.grandTotal : s.budget,
          approvedBoqSnapshot: qt
            ? { quotationNumber: qt.quotationNumber, revisionNumber: qt.revisionNumber, grandTotal: qt.grandTotal }
            : undefined,
          progressPercentage: s.progressPercentage,
          startDate: new Date(Date.now() + s.startDaysOffset * 86400000),
          expectedEndDate: new Date(Date.now() + s.endDaysOffset * 86400000),
          createdByUserId: ctx.superAdminUserId,
        },
      });

      // Assign Site Engineer & Architect memberships
      const seId = siteEngs[i % siteEngs.length];
      await prisma.projectMembership.create({
        data: {
          organisationId: orgId,
          projectId: project.id,
          userId: seId,
          projectRole: 'SITE_ENGINEER',
          status: 'ACTIVE',
        },
      });

      const archId = archs[i % archs.length];
      if (archId !== seId) {
        await prisma.projectMembership.create({
          data: {
            organisationId: orgId,
            projectId: project.id,
            userId: archId,
            projectRole: 'ARCHITECT_DESIGNER',
            status: 'ACTIVE',
          },
        });
      }

      // Activity log
      await prisma.projectActivity.create({
        data: {
          organisationId: orgId,
          projectId: project.id,
          actorUserId: ctx.superAdminUserId,
          action: 'PROJECT_CREATED',
          description: `Project ${s.projectNumber} created${qt ? ` from ${qt.quotationNumber} Rev ${qt.revisionNumber}` : ''}`,
        },
      });
    }

    projectsByCode[s.projectNumber] = project.id;
  }

  return { projectsByCode };
}
