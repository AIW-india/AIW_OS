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

const BoqTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  projectCategory: z.enum([
    'RESIDENTIAL_CONSTRUCTION',
    'COMMERCIAL_CONSTRUCTION',
    'RESIDENTIAL_INTERIOR',
    'COMMERCIAL_INTERIOR',
    'RENOVATION',
    'TURNKEY',
  ]),
  description: z.string().max(255).optional(),
  templateData: z.any().optional(),
  sections: z.any().optional(),
});

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.estimates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { category } = req.query;
      const where: any = { organisationId: orgId, status: 'ACTIVE' };
      if (category && typeof category === 'string') {
        where.projectCategory = category;
      }
      const templates = await prisma.boqTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ data: templates, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.templates.manage'),
  validateRequest({ body: BoqTemplateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const dataPayload = req.body.templateData ?? req.body.sections ?? {};
      const template = await prisma.boqTemplate.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          projectCategory: req.body.projectCategory,
          description: req.body.description ?? null,
          templateData: dataPayload,
          status: 'ACTIVE',
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'boq_template.created',
        resourceType: 'boq_template',
        resourceId: template.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: template,
      });

      res.status(201).json({ data: template, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.templates.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const t = await prisma.boqTemplate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!t) throw new NotFoundError('Template not found');

      await prisma.boqTemplate.update({
        where: { id: t.id },
        data: { status: 'ARCHIVED' },
      });

      res.status(200).json({ data: { id: t.id, status: 'ARCHIVED' }, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const templateRoutes = router;
