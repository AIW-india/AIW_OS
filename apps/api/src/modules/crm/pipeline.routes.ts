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

const CreateStageSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0),
  isTerminal: z.boolean().default(false),
  color: z.string().max(20).optional(),
});

const UpdateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  order: z.number().int().min(0).optional(),
  isTerminal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  color: z.string().max(20).nullable().optional(),
});

// List pipeline stages
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const includeInactive = req.query.includeInactive === 'true';

      const stages = await prisma.leadPipelineStage.findMany({
        where: {
          organisationId: orgId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { order: 'asc' },
      });

      res.status(200).json({ data: stages, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Create pipeline stage
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.pipeline.manage'),
  validateRequest({ body: CreateStageSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { name, code, description, order, isTerminal, color } = req.body;

      const existingCode = await prisma.leadPipelineStage.findUnique({
        where: { organisationId_code: { organisationId: orgId, code } },
      });
      if (existingCode) {
        throw new AppError('Pipeline stage code already exists', 409, 'DUPLICATE_CODE');
      }

      const existingOrder = await prisma.leadPipelineStage.findUnique({
        where: { organisationId_order: { organisationId: orgId, order } },
      });
      if (existingOrder) {
        throw new AppError('A stage with this order position already exists', 409, 'DUPLICATE_ORDER');
      }

      const stage = await prisma.leadPipelineStage.create({
        data: {
          organisationId: orgId,
          name,
          code,
          description: description ?? null,
          order,
          isTerminal,
          color: color ?? null,
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.pipeline_stage.created',
        resourceType: 'pipeline_stage',
        resourceId: stage.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { name, code, order, isTerminal },
      });

      res.status(201).json({ data: stage, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Update pipeline stage
router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.pipeline.manage'),
  validateRequest({ body: UpdateStageSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.leadPipelineStage.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Pipeline stage not found');

      if (req.body.order !== undefined && req.body.order !== existing.order) {
        const conflict = await prisma.leadPipelineStage.findUnique({
          where: { organisationId_order: { organisationId: orgId, order: req.body.order } },
        });
        if (conflict && conflict.id !== existing.id) {
          throw new AppError('A stage with this order position already exists', 409, 'DUPLICATE_ORDER');
        }
      }

      const updated = await prisma.leadPipelineStage.update({
        where: { id: existing.id },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.pipeline_stage.updated',
        resourceType: 'pipeline_stage',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: { name: existing.name, order: existing.order, isTerminal: existing.isTerminal },
        afterJson: { name: updated.name, order: updated.order, isTerminal: updated.isTerminal },
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const pipelineRoutes = router;
