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
import { NotFoundError } from '../../common/errors/app-error.js';

const router = Router();

const UpdateOrganisationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  legalName: z.string().max(180).nullable().optional(),
  timezone: z.string().min(2).max(60).optional(),
  defaultCurrency: z.string().length(3).optional(),
});

router.get(
  '/current',
  requireAuth,
  requireOrganisation,
  requirePermission('organisation.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organisation.findUnique({
        where: { id: req.auth!.organisationId! },
      });
      if (!org) throw new NotFoundError('Organisation not found');

      res.status(200).json({ data: org, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/current',
  requireAuth,
  requireOrganisation,
  requirePermission('organisation.manage'),
  validateRequest({ body: UpdateOrganisationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const before = await prisma.organisation.findUnique({ where: { id: orgId } });
      if (!before) throw new NotFoundError('Organisation not found');

      const updated = await prisma.organisation.update({
        where: { id: orgId },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'organisation.updated',
        resourceType: 'organisation',
        resourceId: orgId,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: before,
        afterJson: updated,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/current/deactivate',
  requireAuth,
  requireOrganisation,
  requirePermission('organisation.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const updated = await prisma.organisation.update({
        where: { id: orgId },
        data: { status: 'INACTIVE' },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'organisation.deactivated',
        resourceType: 'organisation',
        resourceId: orgId,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { status: 'INACTIVE' },
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const organisationRoutes = router;
