import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';
import { checkProjectAccess } from './project-scope.js';
import { calculateProjectProgress, calculateMilestoneProgress } from './project-calculator.js';

const router = Router();

const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  milestoneId: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeUserId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
});

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  completedAt: z.string().datetime().nullable().optional(),
});

const AddCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  comment: z.string().min(1).max(2000).optional(),
  attachments: z.any().optional(),
});

async function syncMilestoneAndProjectProgress(
  projectId: string,
  milestoneId: string | null | undefined,
  organisationId: string,
) {
  if (milestoneId) {
    const tasks = await prisma.projectTask.findMany({
      where: { milestoneId, organisationId },
      select: { status: true },
    });
    const mProgress = calculateMilestoneProgress(tasks);
    await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        progressPercentage: mProgress.toNumber(),
        status: mProgress.equals(100) ? 'COMPLETED' : mProgress.greaterThan(0) ? 'IN_PROGRESS' : 'NOT_STARTED',
      },
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { manualProgressOverride: true },
  });
  if (project?.manualProgressOverride) return;

  const [milestones, allTasks] = await Promise.all([
    prisma.projectMilestone.findMany({
      where: { projectId, organisationId },
      select: { status: true, progressPercentage: true },
    }),
    prisma.projectTask.findMany({
      where: { projectId, organisationId },
      select: { status: true },
    }),
  ]);

  const pProgress = calculateProjectProgress(milestones, allTasks);
  await prisma.project.update({
    where: { id: projectId },
    data: { progressPercentage: pProgress.toNumber() },
  });
}

// ------------------------------------------------------------------------------
// LIST TASKS FOR A PROJECT
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
      if (!scope.hasAccess) throw new ForbiddenError('Not authorised to view tasks.');

      const { status, milestoneId, assigneeUserId } = req.query;
      const where: any = { projectId: req.params.projectId, organisationId: orgId };

      if (status && typeof status === 'string') where.status = status;
      if (milestoneId && typeof milestoneId === 'string') where.milestoneId = milestoneId;
      if (assigneeUserId && typeof assigneeUserId === 'string') where.assigneeUserId = assigneeUserId;

      const tasks = await prisma.projectTask.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          milestone: { select: { id: true, name: true, phaseName: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      });

      res.status(200).json({ data: tasks, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// GET TASK DETAILS WITH COMMENTS
// ------------------------------------------------------------------------------
router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const task = await prisma.projectTask.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          assignee: { select: { id: true, name: true, email: true, phone: true } },
          milestone: true,
          project: { select: { id: true, projectNumber: true, name: true } },
          comments: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!task) throw new NotFoundError('Task not found');

      res.status(200).json({ data: task, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// CREATE TASK
// ------------------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.tasks.create'),
  validateRequest({ body: CreateTaskSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const {
        projectId,
        milestoneId,
        title,
        description,
        status,
        priority,
        assigneeUserId,
        startDate,
        dueDate,
      } = req.body;

      const project = await prisma.project.findFirst({
        where: { id: projectId, organisationId: orgId },
      });
      if (!project) throw new NotFoundError('Project not found');

      const task = await prisma.$transaction(async (tx) => {
        const t = await tx.projectTask.create({
          data: {
            organisationId: orgId,
            projectId,
            milestoneId: milestoneId ?? null,
            title,
            description: description ?? null,
            status,
            priority,
            assigneeUserId: assigneeUserId ?? null,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            completedAt: status === 'COMPLETED' ? new Date() : null,
            createdByUserId: req.auth!.userId,
          },
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId,
            actorUserId: req.auth!.userId,
            action: 'task.created',
            description: `Task "${t.title}" created.`,
          },
        });

        return t;
      });

      await syncMilestoneAndProjectProgress(projectId, milestoneId, orgId);

      res.status(201).json({ data: task, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// UPDATE TASK
// ------------------------------------------------------------------------------
router.put(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.tasks.update'),
  validateRequest({ body: UpdateTaskSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.projectTask.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Task not found');

      const dataToUpdate: any = {};
      if (req.body.title) dataToUpdate.title = req.body.title;
      if (req.body.description !== undefined) dataToUpdate.description = req.body.description;
      if (req.body.status) dataToUpdate.status = req.body.status;
      if (req.body.priority) dataToUpdate.priority = req.body.priority;
      if (req.body.assigneeUserId !== undefined) dataToUpdate.assigneeUserId = req.body.assigneeUserId;
      if (req.body.milestoneId !== undefined) dataToUpdate.milestoneId = req.body.milestoneId;
      if (req.body.startDate !== undefined) dataToUpdate.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
      if (req.body.dueDate !== undefined) dataToUpdate.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

      if (req.body.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        dataToUpdate.completedAt = new Date();
      } else if (req.body.status && req.body.status !== 'COMPLETED') {
        dataToUpdate.completedAt = null;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.projectTask.update({
          where: { id: existing.id },
          data: dataToUpdate,
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId: t.projectId,
            actorUserId: req.auth!.userId,
            action: 'task.updated',
            description: `Task "${t.title}" status changed to ${t.status}.`,
          },
        });

        return t;
      });

      await syncMilestoneAndProjectProgress(
        existing.projectId,
        req.body.milestoneId !== undefined ? req.body.milestoneId : existing.milestoneId,
        orgId,
      );

      res.status(200).json({ success: true, data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// ADD COMMENT TO TASK
// ------------------------------------------------------------------------------
router.post(
  '/:id/comments',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.tasks.update'),
  validateRequest({ body: AddCommentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const task = await prisma.projectTask.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!task) throw new NotFoundError('Task not found');

      const commentText = req.body.content || req.body.comment;
      if (!commentText) throw new BadRequestError('Comment text is required');

      const comment = await prisma.projectTaskComment.create({
        data: {
          taskId: task.id,
          authorUserId: req.auth!.userId,
          content: commentText,
          attachments: req.body.attachments ?? undefined,
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...comment,
          comment: comment.content,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// DELETE TASK
// ------------------------------------------------------------------------------
router.delete(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.tasks.update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.projectTask.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Task not found');

      await prisma.projectTask.delete({
        where: { id: existing.id },
      });

      await syncMilestoneAndProjectProgress(existing.projectId, existing.milestoneId, orgId);

      res.status(200).json({ success: true, message: 'Task deleted.' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
