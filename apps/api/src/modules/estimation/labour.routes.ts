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

const router = Router();

const LabourCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
});

const LabourRateCreateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  code: z.string().min(2).max(50),
  workDescription: z.string().min(2).max(255),
  unit: z.string().min(1).max(20),
  standardRate: z.number().nonnegative(),
});

const LabourRateUpdateSchema = LabourRateCreateSchema.partial();

// ------------------------------------------------------------------------------
// CATEGORIES
// ------------------------------------------------------------------------------

router.get(
  '/categories',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const categories = await prisma.labourCategory.findMany({
        where: { organisationId: orgId },
        include: { _count: { select: { labourRates: true } } },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ data: categories, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/categories',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: LabourCategorySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const category = await prisma.labourCategory.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          description: req.body.description ?? null,
        },
      });
      res.status(201).json({ data: category, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// LABOUR RATES CRUD & RATE HISTORY
// ------------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { search, categoryId, status } = req.query;

      const where: any = { organisationId: orgId };
      if (status && typeof status === 'string') where.status = status;
      if (categoryId && typeof categoryId === 'string') where.categoryId = categoryId;
      if (search && typeof search === 'string') {
        where.OR = [
          { workDescription: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }

      const rates = await prisma.labourRate.findMany({
        where,
        include: { category: true },
        orderBy: { code: 'asc' },
      });

      res.status(200).json({ data: rates, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: LabourRateCreateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { code } = req.body;

      const existing = await prisma.labourRate.findUnique({
        where: { organisationId_code: { organisationId: orgId, code } },
      });
      if (existing) {
        throw new AppError('Labour code already exists', 409, 'CODE_EXISTS');
      }

      const rate = await prisma.labourRate.create({
        data: {
          organisationId: orgId,
          categoryId: req.body.categoryId ?? null,
          code: req.body.code,
          workDescription: req.body.workDescription,
          unit: req.body.unit,
          standardRate: req.body.standardRate,
          status: 'ACTIVE',
        },
      });

      await prisma.labourRateHistory.create({
        data: {
          labourRateId: rate.id,
          rate: rate.standardRate,
          changedByUserId: req.auth!.userId,
          reason: 'Initial creation',
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'labour_rate.created',
        resourceType: 'labour_rate',
        resourceId: rate.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: rate,
      });

      res.status(201).json({ data: rate, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: LabourRateUpdateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const current = await prisma.labourRate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!current) throw new NotFoundError('Labour rate not found');

      const rateChanged =
        req.body.standardRate !== undefined &&
        Number(current.standardRate) !== Number(req.body.standardRate);

      const updated = await prisma.labourRate.update({
        where: { id: current.id },
        data: req.body,
      });

      if (rateChanged) {
        await prisma.labourRateHistory.create({
          data: {
            labourRateId: current.id,
            rate: updated.standardRate,
            changedByUserId: req.auth!.userId,
            reason: 'Rate updated',
          },
        });
      }

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'labour_rate.updated',
        resourceType: 'labour_rate',
        resourceId: current.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: current,
        afterJson: updated,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const labourRoutes = router;
