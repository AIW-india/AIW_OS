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

const CreateDesignationSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(1).max(30),
  description: z.string().max(255).optional(),
});

const UpdateDesignationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(1).max(30).optional(),
  description: z.string().max(255).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('designations.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const designations = await prisma.designation.findMany({
        where: { organisationId: req.auth!.organisationId! },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ data: designations, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('designations.manage'),
  validateRequest({ body: CreateDesignationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const designation = await prisma.designation.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          code: req.body.code.toUpperCase(),
          description: req.body.description ?? null,
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'designation.created',
        resourceType: 'designation',
        resourceId: designation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: designation,
      });

      res.status(201).json({ data: designation, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('designations.manage'),
  validateRequest({ body: UpdateDesignationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.designation.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Designation not found');

      const updated = await prisma.designation.update({
        where: { id: existing.id },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'designation.updated',
        resourceType: 'designation',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: existing,
        afterJson: updated,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const designationRoutes = router;
