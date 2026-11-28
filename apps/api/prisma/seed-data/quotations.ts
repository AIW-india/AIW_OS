import { prisma } from '../../src/database/prisma.js';
import type { SeedOrgContext } from './organisation.js';
import type { SeedCrmResult } from './crm.js';
import type { SeedEstimationResult } from './estimation.js';

export interface SeedQuotationsResult {
  quotationsByCode: Record<string, { id: string; quotationNumber: string; revisionNumber: number; grandTotal: number }>;
}

export async function seedQuotationsData(
  ctx: SeedOrgContext,
  crm: SeedCrmResult,
  est: SeedEstimationResult,
): Promise<SeedQuotationsResult> {
  const orgId = ctx.organisationId;
  const quotationsByCode: Record<string, { id: string; quotationNumber: string; revisionNumber: number; grandTotal: number }> = {};

  const specs = [
    {
      quotationNumber: 'QT-DEMO-001',
      revisionNumber: 2,
      estimateCode: 'EST-DEMO-001',
      customerCode: 'CUST-DEMO-001',
      leadCode: 'LD-DEMO-001',
      status: 'ACCEPTED' as const,
      approved: true,
      dispatched: true,
      notes: 'Rev 2: Updated laminate finish & soft-close hardware specifications',
    },
    {
      quotationNumber: 'QT-DEMO-002',
      revisionNumber: 2,
      estimateCode: 'EST-DEMO-002',
      customerCode: 'CUST-DEMO-002',
      leadCode: 'LD-DEMO-002',
      status: 'ACCEPTED' as const,
      approved: true,
      dispatched: true,
      notes: 'Rev 2: Commercial fitout with acoustic ceiling & modular workstations',
    },
    {
      quotationNumber: 'QT-DEMO-003',
      revisionNumber: 1,
      estimateCode: 'EST-DEMO-003',
      customerCode: 'CUST-DEMO-003',
      leadCode: 'LD-DEMO-003',
      status: 'DISPATCHED' as const,
      approved: true,
      dispatched: true,
      notes: 'Dispatched to client for final sign-off',
    },
    {
      quotationNumber: 'QT-DEMO-004',
      revisionNumber: 1,
      estimateCode: 'EST-DEMO-004',
      customerCode: 'CUST-DEMO-004',
      leadCode: 'LD-DEMO-004',
      status: 'PENDING_APPROVAL' as const,
      approved: false,
      dispatched: false,
      notes: 'Submitted for commercial approval',
    },
    {
      quotationNumber: 'QT-DEMO-005',
      revisionNumber: 1,
      estimateCode: 'EST-DEMO-005',
      customerCode: 'CUST-DEMO-005',
      leadCode: 'LD-DEMO-005',
      status: 'DRAFT' as const,
      approved: false,
      dispatched: false,
      notes: 'Initial draft quotation',
    },
  ];

  for (const spec of specs) {
    const estimateId = est.estimatesByCode[spec.estimateCode];
    const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
    if (!estimate) continue;

    // If revisionNumber === 2, ensure Rev 1 exists as historical revision
    if (spec.revisionNumber === 2) {
      const rev1 = await prisma.quotation.findFirst({
        where: { organisationId: orgId, quotationNumber: spec.quotationNumber, revisionNumber: 1 },
      });
      if (!rev1) {
        await prisma.quotation.create({
          data: {
            organisationId: orgId,
            quotationNumber: spec.quotationNumber,
            revisionNumber: 1,
            title: estimate.title,
            estimateId,
            customerId: crm.customersByCode[spec.customerCode],
            status: 'REJECTED',
            subtotal: Number(estimate.subtotalCost) * 0.95,
            taxAmount: Number(estimate.taxAmount) * 0.95,
            grandTotal: Number(estimate.grandTotal) * 0.95,
            validUntil: new Date(Date.now() + 30 * 86400000),
            createdByUserId: ctx.superAdminUserId,
          },
        });
      }
    }

    let qt = await prisma.quotation.findFirst({
      where: {
        organisationId: orgId,
        quotationNumber: spec.quotationNumber,
        revisionNumber: spec.revisionNumber,
      },
    });

    if (!qt) {
      qt = await prisma.quotation.create({
        data: {
          organisationId: orgId,
          quotationNumber: spec.quotationNumber,
          revisionNumber: spec.revisionNumber,
          title: estimate.title,
          estimateId,
          customerId: crm.customersByCode[spec.customerCode],
          status: spec.status,
          subtotal: estimate.subtotalCost,
          taxAmount: estimate.taxAmount,
          grandTotal: estimate.grandTotal,
          validUntil: new Date(Date.now() + 30 * 86400000),
          createdByUserId: ctx.superAdminUserId,
          dispatchedAt: spec.dispatched ? new Date(Date.now() - 8 * 86400000) : null,
        },
      });
    }

    quotationsByCode[spec.quotationNumber] = {
      id: qt.id,
      quotationNumber: qt.quotationNumber,
      revisionNumber: qt.revisionNumber,
      grandTotal: Number(qt.grandTotal),
    };
  }

  return { quotationsByCode };
}
