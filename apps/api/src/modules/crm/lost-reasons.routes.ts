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
import { NotFoundError, AppError } from '../../common/errors/app-error.js';

const router = Router();

const CreateLostReasonSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
});

const UpdateLostReasonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

// List lost reason categories
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const includeInactive = req.query.includeInactive === 'true';

      const reasons = await prisma.lostReasonCategory.findMany({
        where: {
          organisationId: orgId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ data: reasons, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Create lost reason category
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.pipeline.manage'),
  validateRequest({ body: CreateLostReasonSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { name, code } = req.body;

      const existing = await prisma.lostReasonCategory.findUnique({
        where: { organisationId_code: { organisationId: orgId, code } },
      });
      if (existing) {
        throw new AppError('Lost reason code already exists', 409, 'DUPLICATE_CODE');
      }

      const reason = await prisma.lostReasonCategory.create({
        data: { organisationId: orgId, name, code },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lost_reason.created',
        resourceType: 'lost_reason_category',
        resourceId: reason.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { name, code },
      });

      res.status(201).json({ data: reason, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Update lost reason category
router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.pipeline.manage'),
  validateRequest({ body: UpdateLostReasonSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.lostReasonCategory.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Lost reason category not found');

      const updated = await prisma.lostReasonCategory.update({
        where: { id: existing.id },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lost_reason.updated',
        resourceType: 'lost_reason_category',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: { name: existing.name, isActive: existing.isActive },
        afterJson: { name: updated.name, isActive: updated.isActive },
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const lostReasonRoutes = router;
