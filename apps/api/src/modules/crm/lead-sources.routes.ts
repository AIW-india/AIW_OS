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

const CreateLeadSourceSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  description: z.string().max(500).optional(),
});

const UpdateLeadSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

// List lead sources
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const includeInactive = req.query.includeInactive === 'true';

      const sources = await prisma.leadSource.findMany({
        where: {
          organisationId: orgId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ data: sources, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Create lead source
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.pipeline.manage'),
  validateRequest({ body: CreateLeadSourceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { name, code, description } = req.body;

      const existing = await prisma.leadSource.findUnique({
        where: { organisationId_code: { organisationId: orgId, code } },
      });
      if (existing) {
        throw new AppError('Lead source code already exists', 409, 'DUPLICATE_CODE');
      }

      const source = await prisma.leadSource.create({
        data: { organisationId: orgId, name, code, description: description ?? null },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead_source.created',
        resourceType: 'lead_source',
        resourceId: source.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { name, code },
      });

      res.status(201).json({ data: source, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Update lead source
router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.pipeline.manage'),
  validateRequest({ body: UpdateLeadSourceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.leadSource.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Lead source not found');

      const updated = await prisma.leadSource.update({
        where: { id: existing.id },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead_source.updated',
        resourceType: 'lead_source',
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

export const leadSourceRoutes = router;
