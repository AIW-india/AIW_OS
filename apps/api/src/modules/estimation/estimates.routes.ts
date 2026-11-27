import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { recordAuditEvent } from '../../common/audit/audit.service.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import {
  calculateBoqItem,
  calculateEstimateSummary,
} from './estimation-calculator.js';

const router = Router();

const BoqItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  orderIndex: z.number().int().nonnegative().optional().default(0),
  description: z.string().min(1).max(255),
  itemCode: z.string().optional(),
  unit: z.string().optional(),
  materialId: z.string().uuid().nullable().optional(),
  materialQty: z.number().nonnegative().optional(),
  materialQuantity: z.number().nonnegative().optional(),
  materialUnit: z.string().max(20).nullable().optional(),
  materialRate: z.number().nonnegative().default(0),
  labourRateId: z.string().uuid().nullable().optional(),
  labourQty: z.number().nonnegative().optional(),
  labourQuantity: z.number().nonnegative().optional(),
  labourUnit: z.string().max(20).nullable().optional(),
  labourRate: z.number().nonnegative().default(0),
  otherCharges: z.number().nonnegative().optional(),
  otherRate: z.number().nonnegative().optional(),
});

const BoqSectionInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(150).optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(255).nullable().optional(),
  orderIndex: z.number().int().nonnegative().optional().default(0),
  sectionOrder: z.number().int().nonnegative().optional().default(0),
  items: z.array(BoqItemInputSchema).default([]),
});

const EstimateCreateSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  projectCategory: z.enum([
    'RESIDENTIAL_CONSTRUCTION',
    'COMMERCIAL_CONSTRUCTION',
    'RESIDENTIAL_INTERIOR',
    'COMMERCIAL_INTERIOR',
    'RENOVATION',
    'TURNKEY',
  ]),
  projectLocation: z.string().max(255).optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  wastagePercent: z.number().min(0).max(100).default(0),
  overheadPercent: z.number().min(0).max(100).default(0),
  profitMarginPercent: z.number().min(0).max(100).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  taxPercent: z.number().min(0).max(100).default(18),
  sections: z.array(BoqSectionInputSchema).default([]),
});

const EstimateUpdateSchema = EstimateCreateSchema.partial().extend({
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REVISED', 'ARCHIVED']).optional(),
});

// Helper to generate sequential Estimate Number per org
async function generateEstimateNumber(organisationId: string): Promise<string> {
  const count = await prisma.estimate.count({ where: { organisationId } });
  return `EST-${String(count + 1).padStart(5, '0')}`;
}

// ------------------------------------------------------------------------------
// ESTIMATES LIST & SEARCH
// ------------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { search, status, leadId, customerId, category, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organisationId: orgId };
      if (status && typeof status === 'string') where.status = status;
      if (leadId && typeof leadId === 'string') where.leadId = leadId;
      if (customerId && typeof customerId === 'string') where.customerId = customerId;
      if (category && typeof category === 'string') where.projectCategory = category;
      if (search && typeof search === 'string') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { estimateNumber: { contains: search, mode: 'insensitive' } },
          { projectLocation: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.estimate.findMany({
          where,
          include: {
            lead: { select: { id: true, leadNumber: true, customerName: true } },
            customer: { select: { id: true, customerNumber: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            _count: { select: { sections: true, quotations: true, revisions: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.estimate.count({ where }),
      ]);

      res.status(200).json({
        data: items,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          requestId: req.id,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// CREATE ESTIMATE
// ------------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.create'),
  validateRequest({ body: EstimateCreateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const estimateNumber = await generateEstimateNumber(orgId);

      type SectionInput = z.infer<typeof BoqSectionInputSchema>;
      type ItemInput = z.infer<typeof BoqItemInputSchema>;

      // Pre-calculate line items
      const calculatedSections = req.body.sections.map((section: SectionInput, sIdx: number) => {
        const calculatedItems = section.items.map((item: ItemInput, iIdx: number) => {
          const mQty = item.materialQty ?? item.materialQuantity ?? 0;
          const lQty = item.labourQty ?? item.labourQuantity ?? 0;
          const oChg = item.otherCharges ?? item.otherRate ?? 0;
          const u = item.unit ?? item.materialUnit ?? null;

          const calc = calculateBoqItem({
            materialQty: mQty,
            materialRate: item.materialRate,
            labourQty: lQty,
            labourRate: item.labourRate,
            otherCharges: oChg,
          });

          return {
            ...item,
            orderIndex: item.orderIndex ?? iIdx,
            materialQty: mQty,
            materialUnit: u,
            labourQty: lQty,
            labourUnit: item.labourUnit ?? u,
            otherCharges: oChg,
            materialTotal: calc.materialTotal.toNumber(),
            labourTotal: calc.labourTotal.toNumber(),
            itemTotal: calc.itemTotal.toNumber(),
            calc,
          };
        });
        return {
          ...section,
          title: section.title ?? section.name ?? 'Untitled Section',
          orderIndex: section.orderIndex ?? section.sectionOrder ?? sIdx,
          items: calculatedItems,
        };
      });

      const allCalculatedItems = calculatedSections.flatMap((s: any) => s.items.map((i: any) => i.calc));
      const summary = calculateEstimateSummary({
        items: allCalculatedItems,
        wastagePercent: req.body.wastagePercent,
        overheadPercent: req.body.overheadPercent,
        profitMarginPercent: req.body.profitMarginPercent,
        discountPercent: req.body.discountPercent,
        taxPercent: req.body.taxPercent,
      });

      const estimate = await prisma.estimate.create({
        data: {
          organisationId: orgId,
          estimateNumber,
          revisionNumber: 1,
          title: req.body.title,
          description: req.body.description ?? null,
          projectCategory: req.body.projectCategory,
          projectLocation: req.body.projectLocation ?? null,
          leadId: req.body.leadId ?? null,
          customerId: req.body.customerId ?? null,
          status: 'DRAFT',
          totalMaterialCost: summary.totalMaterialCost.toNumber(),
          totalLabourCost: summary.totalLabourCost.toNumber(),
          totalOtherCharges: summary.totalOtherCharges.toNumber(),
          subtotalCost: summary.subtotalCost.toNumber(),
          wastagePercent: summary.wastagePercent.toNumber(),
          wastageAmount: summary.wastageAmount.toNumber(),
          overheadPercent: summary.overheadPercent.toNumber(),
          overheadAmount: summary.overheadAmount.toNumber(),
          profitMarginPercent: summary.profitMarginPercent.toNumber(),
          profitMarginAmount: summary.profitMarginAmount.toNumber(),
          discountPercent: summary.discountPercent.toNumber(),
          discountAmount: summary.discountAmount.toNumber(),
          taxPercent: summary.taxPercent.toNumber(),
          taxAmount: summary.taxAmount.toNumber(),
          grandTotal: summary.grandTotal.toNumber(),
          createdByUserId: req.auth!.userId,
          sections: {
            create: calculatedSections.map((s: any) => ({
              title: s.title,
              description: s.description ?? null,
              orderIndex: s.orderIndex,
              items: {
                create: s.items.map((i: any) => ({
                  orderIndex: i.orderIndex,
                  description: i.description,
                  materialId: i.materialId ?? null,
                  materialQty: i.materialQty,
                  materialUnit: i.materialUnit ?? null,
                  materialRate: i.materialRate,
                  materialTotal: i.materialTotal,
                  labourRateId: i.labourRateId ?? null,
                  labourQty: i.labourQty,
                  labourUnit: i.labourUnit ?? null,
                  labourRate: i.labourRate,
                  labourTotal: i.labourTotal,
                  otherCharges: i.otherCharges,
                  itemTotal: i.itemTotal,
                })),
              },
            })),
          },
        },
        include: {
          sections: { include: { items: true } },
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'estimate.created',
        resourceType: 'estimate',
        resourceId: estimate.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { estimateNumber, grandTotal: summary.grandTotal.toNumber() },
      });

      res.status(201).json({ data: estimate, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// GET ESTIMATE DETAILS
// ------------------------------------------------------------------------------

router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const estimate = await prisma.estimate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          lead: true,
          customer: true,
          createdBy: { select: { id: true, name: true, email: true } },
          parentEstimate: {
            select: { id: true, estimateNumber: true, revisionNumber: true, grandTotal: true },
          },
          revisions: {
            select: {
              id: true,
              estimateNumber: true,
              revisionNumber: true,
              status: true,
              grandTotal: true,
              createdAt: true,
            },
            orderBy: { revisionNumber: 'asc' },
          },
          sections: {
            orderBy: { orderIndex: 'asc' },
            include: {
              items: {
                orderBy: { orderIndex: 'asc' },
                include: { material: true, labour: true },
              },
            },
          },
          quotations: {
            orderBy: { revisionNumber: 'desc' },
            include: {
              approvals: {
                orderBy: { decidedAt: 'desc' },
                include: { approver: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });

      if (!estimate) throw new NotFoundError('Estimate not found');
      res.status(200).json({ data: estimate, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// UPDATE ESTIMATE / BOQ BUILDER SAVE
// ------------------------------------------------------------------------------

router.put(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.update'),
  validateRequest({ body: EstimateUpdateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const current = await prisma.estimate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: { sections: { include: { items: true } } },
      });
      if (!current) throw new NotFoundError('Estimate not found');

      if (current.status === 'APPROVED' && req.body.sections) {
        throw new AppError(
          'Approved estimates are immutable. Create a new revision instead.',
          400,
          'ESTIMATE_APPROVED_IMMUTABLE',
        );
      }

      // If sections provided, recalculate everything
      let summaryData: any = {};
      const sections = req.body.sections;

      if (sections) {
        const calculatedSections = sections.map((section: any, sIdx: number) => {
          const calculatedItems = section.items.map((item: any, iIdx: number) => {
            const calc = calculateBoqItem(item);
            return {
              ...item,
              orderIndex: item.orderIndex || iIdx,
              materialTotal: calc.materialTotal.toNumber(),
              labourTotal: calc.labourTotal.toNumber(),
              otherCharges: calc.otherCharges.toNumber(),
              itemTotal: calc.itemTotal.toNumber(),
              calc,
            };
          });
          return {
            ...section,
            orderIndex: section.orderIndex || sIdx,
            items: calculatedItems,
          };
        });

        const allCalculatedItems = calculatedSections.flatMap((s: any) => s.items.map((i: any) => i.calc));
        const summary = calculateEstimateSummary({
          items: allCalculatedItems,
          wastagePercent: req.body.wastagePercent ?? current.wastagePercent,
          overheadPercent: req.body.overheadPercent ?? current.overheadPercent,
          profitMarginPercent: req.body.profitMarginPercent ?? current.profitMarginPercent,
          discountPercent: req.body.discountPercent ?? current.discountPercent,
          taxPercent: req.body.taxPercent ?? current.taxPercent,
        });

        summaryData = {
          totalMaterialCost: summary.totalMaterialCost.toNumber(),
          totalLabourCost: summary.totalLabourCost.toNumber(),
          totalOtherCharges: summary.totalOtherCharges.toNumber(),
          subtotalCost: summary.subtotalCost.toNumber(),
          wastagePercent: summary.wastagePercent.toNumber(),
          wastageAmount: summary.wastageAmount.toNumber(),
          overheadPercent: summary.overheadPercent.toNumber(),
          overheadAmount: summary.overheadAmount.toNumber(),
          profitMarginPercent: summary.profitMarginPercent.toNumber(),
          profitMarginAmount: summary.profitMarginAmount.toNumber(),
          discountPercent: summary.discountPercent.toNumber(),
          discountAmount: summary.discountAmount.toNumber(),
          taxPercent: summary.taxPercent.toNumber(),
          taxAmount: summary.taxAmount.toNumber(),
          grandTotal: summary.grandTotal.toNumber(),
        };

        // Transactional update of sections & items
        await prisma.$transaction(async (tx) => {
          // Delete old sections cascade
          await tx.boqSection.deleteMany({ where: { estimateId: current.id } });

          // Insert fresh sections
          for (const s of calculatedSections) {
            await tx.boqSection.create({
              data: {
                estimateId: current.id,
                title: s.title,
                description: s.description ?? null,
                orderIndex: s.orderIndex,
                items: {
                  create: s.items.map((i: any) => ({
                    orderIndex: i.orderIndex,
                    description: i.description,
                    materialId: i.materialId ?? null,
                    materialQty: i.materialQty,
                    materialUnit: i.materialUnit ?? null,
                    materialRate: i.materialRate,
                    materialTotal: i.materialTotal,
                    labourRateId: i.labourRateId ?? null,
                    labourQty: i.labourQty,
                    labourUnit: i.labourUnit ?? null,
                    labourRate: i.labourRate,
                    labourTotal: i.labourTotal,
                    otherCharges: i.otherCharges,
                    itemTotal: i.itemTotal,
                  })),
                },
              },
            });
          }
        });
      }

      const updated = await prisma.estimate.update({
        where: { id: current.id },
        data: {
          title: req.body.title ?? current.title,
          description: req.body.description !== undefined ? req.body.description : current.description,
          projectCategory: req.body.projectCategory ?? current.projectCategory,
          projectLocation: req.body.projectLocation !== undefined ? req.body.projectLocation : current.projectLocation,
          status: req.body.status ?? current.status,
          leadId: req.body.leadId !== undefined ? req.body.leadId : current.leadId,
          customerId: req.body.customerId !== undefined ? req.body.customerId : current.customerId,
          ...summaryData,
        },
        include: {
          sections: { include: { items: true } },
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'estimate.updated',
        resourceType: 'estimate',
        resourceId: current.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { grandTotal: updated.grandTotal },
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// CREATE ESTIMATE REVISION (PRESERVES HISTORICAL APPROVED REVISION)
// ------------------------------------------------------------------------------

router.post(
  '/:id/revise',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const original = await prisma.estimate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          sections: {
            include: { items: true },
          },
        },
      });
      if (!original) throw new NotFoundError('Estimate not found');

      // Find highest revision count for this estimate number
      const existingRevisions = await prisma.estimate.findMany({
        where: { organisationId: orgId, estimateNumber: original.estimateNumber },
        select: { revisionNumber: true },
        orderBy: { revisionNumber: 'desc' },
      });

      const nextRevision = (existingRevisions[0]?.revisionNumber || original.revisionNumber) + 1;

      // Mark original as REVISED if it was APPROVED
      if (original.status === 'APPROVED') {
        await prisma.estimate.update({
          where: { id: original.id },
          data: { status: 'REVISED' },
        });
      }

      // Clone original into new revision
      const newEstimate = await prisma.estimate.create({
        data: {
          organisationId: orgId,
          estimateNumber: original.estimateNumber,
          revisionNumber: nextRevision,
          parentEstimateId: original.parentEstimateId || original.id,
          title: `${original.title} (Rev ${nextRevision})`,
          description: original.description,
          projectCategory: original.projectCategory,
          projectLocation: original.projectLocation,
          leadId: original.leadId,
          customerId: original.customerId,
          status: 'DRAFT',
          totalMaterialCost: original.totalMaterialCost,
          totalLabourCost: original.totalLabourCost,
          totalOtherCharges: original.totalOtherCharges,
          subtotalCost: original.subtotalCost,
          wastagePercent: original.wastagePercent,
          wastageAmount: original.wastageAmount,
          overheadPercent: original.overheadPercent,
          overheadAmount: original.overheadAmount,
          profitMarginPercent: original.profitMarginPercent,
          profitMarginAmount: original.profitMarginAmount,
          discountPercent: original.discountPercent,
          discountAmount: original.discountAmount,
          taxPercent: original.taxPercent,
          taxAmount: original.taxAmount,
          grandTotal: original.grandTotal,
          createdByUserId: req.auth!.userId,
          sections: {
            create: original.sections.map((s) => ({
              title: s.title,
              description: s.description,
              orderIndex: s.orderIndex,
              items: {
                create: s.items.map((i) => ({
                  orderIndex: i.orderIndex,
                  description: i.description,
                  materialId: i.materialId,
                  materialQty: i.materialQty,
                  materialUnit: i.materialUnit,
                  materialRate: i.materialRate,
                  materialTotal: i.materialTotal,
                  labourRateId: i.labourRateId,
                  labourQty: i.labourQty,
                  labourUnit: i.labourUnit,
                  labourRate: i.labourRate,
                  labourTotal: i.labourTotal,
                  otherCharges: i.otherCharges,
                  itemTotal: i.itemTotal,
                })),
              },
            })),
          },
        },
        include: {
          sections: { include: { items: true } },
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'estimate.revised',
        resourceType: 'estimate',
        resourceId: newEstimate.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: {
          estimateNumber: original.estimateNumber,
          revisionNumber: nextRevision,
          clonedFromId: original.id,
        },
      });

      res.status(201).json({ data: newEstimate, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// DUPLICATE ESTIMATE (NEW INDEPENDENT ESTIMATE)
// ------------------------------------------------------------------------------

router.post(
  '/:id/duplicate',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const original = await prisma.estimate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: { sections: { include: { items: true } } },
      });
      if (!original) throw new NotFoundError('Estimate not found');

      const estimateNumber = await generateEstimateNumber(orgId);

      const duplicated = await prisma.estimate.create({
        data: {
          organisationId: orgId,
          estimateNumber,
          revisionNumber: 1,
          title: `Copy of ${original.title}`,
          description: original.description,
          projectCategory: original.projectCategory,
          projectLocation: original.projectLocation,
          leadId: original.leadId,
          customerId: original.customerId,
          status: 'DRAFT',
          totalMaterialCost: original.totalMaterialCost,
          totalLabourCost: original.totalLabourCost,
          totalOtherCharges: original.totalOtherCharges,
          subtotalCost: original.subtotalCost,
          wastagePercent: original.wastagePercent,
          wastageAmount: original.wastageAmount,
          overheadPercent: original.overheadPercent,
          overheadAmount: original.overheadAmount,
          profitMarginPercent: original.profitMarginPercent,
          profitMarginAmount: original.profitMarginAmount,
          discountPercent: original.discountPercent,
          discountAmount: original.discountAmount,
          taxPercent: original.taxPercent,
          taxAmount: original.taxAmount,
          grandTotal: original.grandTotal,
          createdByUserId: req.auth!.userId,
          sections: {
            create: original.sections.map((s) => ({
              title: s.title,
              description: s.description,
              orderIndex: s.orderIndex,
              items: {
                create: s.items.map((i) => ({
                  orderIndex: i.orderIndex,
                  description: i.description,
                  materialId: i.materialId,
                  materialQty: i.materialQty,
                  materialUnit: i.materialUnit,
                  materialRate: i.materialRate,
                  materialTotal: i.materialTotal,
                  labourRateId: i.labourRateId,
                  labourQty: i.labourQty,
                  labourUnit: i.labourUnit,
                  labourRate: i.labourRate,
                  labourTotal: i.labourTotal,
                  otherCharges: i.otherCharges,
                  itemTotal: i.itemTotal,
                })),
              },
            })),
          },
        },
        include: { sections: { include: { items: true } } },
      });

      res.status(201).json({ data: duplicated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const estimateRoutes = router;
