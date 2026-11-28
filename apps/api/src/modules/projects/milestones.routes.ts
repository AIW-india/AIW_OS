import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';
import { checkProjectAccess } from './project-scope.js';
import { calculateProjectProgress } from './project-calculator.js';

const router = Router();

const CreateMilestoneSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2).max(150),
  phaseName: z.string().min(2).max(100).default('Execution'),
  description: z.string().max(500).optional(),
  sequenceOrder: z.number().int().positive().default(1),
  plannedStartDate: z.string().datetime().optional(),
  plannedEndDate: z.string().datetime().optional(),
  predecessorMilestoneId: z.string().uuid().nullable().optional(),
  responsibleUserId: z.string().uuid().nullable().optional(),
});

const UpdateMilestoneSchema = CreateMilestoneSchema.partial().extend({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  actualCompletionDate: z.string().datetime().nullable().optional(),
});

// Helper to recalculate project progress after milestone change
async function syncProjectProgress(projectId: string, organisationId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { manualProgressOverride: true },
  });
  if (project?.manualProgressOverride) return;

  const [milestones, tasks] = await Promise.all([
    prisma.projectMilestone.findMany({
      where: { projectId, organisationId },
      select: { status: true, progressPercentage: true },
    }),
    prisma.projectTask.findMany({
      where: { projectId, organisationId },
      select: { status: true },
    }),
  ]);

  const newProgress = calculateProjectProgress(milestones, tasks);
  await prisma.project.update({
    where: { id: projectId },
    data: { progressPercentage: newProgress.toNumber() },
  });
}

// ------------------------------------------------------------------------------
// LIST MILESTONES FOR A PROJECT
// ------------------------------------------------------------------------------
router.get(
  '/project/:projectId',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.projectId, userId, permissions);
      if (!scope.hasAccess) throw new ForbiddenError('Not authorised to view milestones.');

      const milestones = await prisma.projectMilestone.findMany({
        where: { projectId: req.params.projectId, organisationId: orgId },
        include: {
          responsibleUser: { select: { id: true, name: true, email: true } },
          predecessor: { select: { id: true, name: true, status: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { sequenceOrder: 'asc' },
      });

      res.status(200).json({ data: milestones, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// CREATE MILESTONE
// ------------------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.milestones.manage'),
  validateRequest({ body: CreateMilestoneSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const {
        projectId,
        name,
        phaseName,
        description,
        sequenceOrder,
        plannedStartDate,
        plannedEndDate,
        predecessorMilestoneId,
        responsibleUserId,
      } = req.body;

      const project = await prisma.project.findFirst({
        where: { id: projectId, organisationId: orgId },
      });
      if (!project) throw new NotFoundError('Project not found');

      const milestone = await prisma.$transaction(async (tx) => {
        const m = await tx.projectMilestone.create({
          data: {
            organisationId: orgId,
            projectId,
            name,
            phaseName,
            description: description ?? null,
            sequenceOrder,
            plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
            plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
            predecessorMilestoneId: predecessorMilestoneId ?? null,
            responsibleUserId: responsibleUserId ?? null,
          },
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId,
            actorUserId: req.auth!.userId,
            action: 'milestone.created',
            description: `Milestone "${m.name}" created under ${m.phaseName}.`,
          },
        });

        return m;
      });

      await syncProjectProgress(projectId, orgId);

      res.status(201).json({ data: milestone, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// UPDATE MILESTONE
// ------------------------------------------------------------------------------
router.put(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.milestones.manage'),
  validateRequest({ body: UpdateMilestoneSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.projectMilestone.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Milestone not found');

      const dataToUpdate: any = {};
      if (req.body.name) dataToUpdate.name = req.body.name;
      if (req.body.phaseName) dataToUpdate.phaseName = req.body.phaseName;
      if (req.body.description !== undefined) dataToUpdate.description = req.body.description;
      if (req.body.sequenceOrder) dataToUpdate.sequenceOrder = req.body.sequenceOrder;
      if (req.body.status) dataToUpdate.status = req.body.status;
      if (req.body.progressPercentage !== undefined) {
        dataToUpdate.progressPercentage = req.body.progressPercentage;
      }
      if (req.body.plannedStartDate !== undefined) {
        dataToUpdate.plannedStartDate = req.body.plannedStartDate ? new Date(req.body.plannedStartDate) : null;
      }
      if (req.body.plannedEndDate !== undefined) {
        dataToUpdate.plannedEndDate = req.body.plannedEndDate ? new Date(req.body.plannedEndDate) : null;
      }
      if (req.body.actualCompletionDate !== undefined) {
        dataToUpdate.actualCompletionDate = req.body.actualCompletionDate ? new Date(req.body.actualCompletionDate) : null;
      }
      if (req.body.predecessorMilestoneId !== undefined) {
        dataToUpdate.predecessorMilestoneId = req.body.predecessorMilestoneId;
      }
      if (req.body.responsibleUserId !== undefined) {
        dataToUpdate.responsibleUserId = req.body.responsibleUserId;
      }

      // Auto-set completion date if status set to COMPLETED
      if (req.body.status === 'COMPLETED' && !dataToUpdate.actualCompletionDate) {
        dataToUpdate.actualCompletionDate = new Date();
        dataToUpdate.progressPercentage = 100;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const m = await tx.projectMilestone.update({
          where: { id: existing.id },
          data: dataToUpdate,
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId: m.projectId,
            actorUserId: req.auth!.userId,
            action: 'milestone.updated',
            description: `Milestone "${m.name}" updated to status ${m.status} (${m.progressPercentage}%).`,
          },
        });

        return m;
      });

      await syncProjectProgress(existing.projectId, orgId);

      res.status(200).json({ success: true, data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// DELETE MILESTONE
// ------------------------------------------------------------------------------
router.delete(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.milestones.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.projectMilestone.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Milestone not found');

      await prisma.projectMilestone.delete({
        where: { id: existing.id },
      });

      await syncProjectProgress(existing.projectId, orgId);

      res.status(200).json({ success: true, message: 'Milestone deleted.' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
