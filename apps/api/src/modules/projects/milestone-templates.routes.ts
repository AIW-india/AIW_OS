import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { NotFoundError } from '../../common/errors/app-error.js';

const router = Router();

const TemplateSchema = z.object({
  name: z.string().min(2).max(100),
  projectCategory: z.enum([
    'RESIDENTIAL_INTERIOR',
    'RESIDENTIAL_CONSTRUCTION',
    'COMMERCIAL_INTERIOR',
    'COMMERCIAL_CONSTRUCTION',
    'RENOVATION',
    'TURNKEY',
  ]),
  description: z.string().max(500).optional(),
  templateData: z.array(
    z.object({
      phaseName: z.string().min(1).optional(),
      name: z.string().min(1),
      sequenceOrder: z.number().int().positive().optional(),
      estimatedDays: z.number().int().positive().optional(),
    }),
  ).optional(),
  phases: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      estimatedDays: z.number().optional(),
      tasks: z.array(z.string()).optional(),
    }),
  ).optional(),
  isDefault: z.boolean().default(false),
});

// LIST TEMPLATES
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { category } = req.query;
      const where: any = { organisationId: orgId };
      if (category && typeof category === 'string') where.projectCategory = category;

      const templates = await prisma.projectMilestoneTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ data: templates, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// CREATE TEMPLATE
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.milestones.manage'),
  validateRequest({ body: TemplateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const templateItems = req.body.templateData || (req.body.phases ? req.body.phases.map((p: any, idx: number) => ({
        phaseName: p.name,
        name: p.name,
        sequenceOrder: idx + 1,
        estimatedDays: p.estimatedDays,
        tasks: p.tasks || []
      })) : []);

      const template = await prisma.projectMilestoneTemplate.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          projectCategory: req.body.projectCategory,
          description: req.body.description ?? null,
          templateData: templateItems,
          isDefault: req.body.isDefault ?? false,
        },
      });

      res.status(201).json({ success: true, data: template, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// APPLY TEMPLATE TO PROJECT
router.post(
  '/:id/apply/:projectId',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.milestones.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const template = await prisma.projectMilestoneTemplate.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!template) throw new NotFoundError('Milestone template not found');

      const project = await prisma.project.findFirst({
        where: { id: req.params.projectId, organisationId: orgId },
      });
      if (!project) throw new NotFoundError('Project not found');

      const items = Array.isArray(template.templateData) ? template.templateData : [];

      const createdMilestones = await prisma.$transaction(
        items.map((item: any, idx: number) =>
          prisma.projectMilestone.create({
            data: {
              organisationId: orgId,
              projectId: project.id,
              name: item.name,
              phaseName: item.phaseName || 'Execution',
              sequenceOrder: item.sequenceOrder || idx + 1,
              status: 'NOT_STARTED',
              progressPercentage: 0,
            },
          }),
        ),
      );

      res.status(201).json({
        data: createdMilestones,
        message: `Applied ${createdMilestones.length} milestones from template.`,
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
