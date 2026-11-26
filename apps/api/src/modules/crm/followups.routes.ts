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

const CreateFollowUpSchema = z.object({
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'MEETING']),
  scheduledAt: z.string().min(1),
  assignedUserId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  reminderAt: z.string().optional(),
});

const CompleteFollowUpSchema = z.object({
  outcome: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

// List follow-ups
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.followups.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = (req.query.status as string) || undefined;
      const assignedUserId = (req.query.assignedUserId as string) || undefined;
      const overdue = req.query.overdue === 'true';

      const where: Record<string, unknown> = { organisationId: orgId };
      if (status) where.status = status;
      if (assignedUserId) where.assignedUserId = assignedUserId;
      if (overdue) {
        where.status = 'PENDING';
        where.scheduledAt = { lt: new Date() };
      }

      const [followUps, total] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: {
            lead: { select: { id: true, leadNumber: true, customerName: true } },
            customer: { select: { id: true, customerNumber: true, name: true } },
            assignedUser: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.followUp.count({ where }),
      ]);

      res.status(200).json({
        data: followUps,
        meta: {
          requestId: req.id,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Create follow-up
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.followups.manage'),
  validateRequest({ body: CreateFollowUpSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { leadId, customerId, type, scheduledAt, assignedUserId, notes, reminderAt } = req.body;

      if (!leadId && !customerId) {
        throw new AppError('Either leadId or customerId is required', 400, 'MISSING_REFERENCE');
      }

      // Validate the referenced entity belongs to the same org
      if (leadId) {
        const lead = await prisma.lead.findFirst({ where: { id: leadId, organisationId: orgId } });
        if (!lead) throw new NotFoundError('Lead not found');
      }
      if (customerId) {
        const customer = await prisma.customer.findFirst({ where: { id: customerId, organisationId: orgId } });
        if (!customer) throw new NotFoundError('Customer not found');
      }

      const followUp = await prisma.followUp.create({
        data: {
          organisationId: orgId,
          leadId: leadId ?? null,
          customerId: customerId ?? null,
          type,
          scheduledAt: new Date(scheduledAt),
          assignedUserId: assignedUserId ?? req.auth!.userId,
          status: 'PENDING',
          notes: notes ?? null,
          reminderAt: reminderAt ? new Date(reminderAt) : null,
          createdByUserId: req.auth!.userId,
        },
        include: {
          lead: { select: { id: true, leadNumber: true, customerName: true } },
          customer: { select: { id: true, customerNumber: true, name: true } },
          assignedUser: { select: { id: true, name: true } },
        },
      });

      // Record lead activity
      if (leadId) {
        await prisma.leadActivity.create({
          data: {
            organisationId: orgId,
            leadId,
            actorUserId: req.auth!.userId,
            activityType: 'FOLLOW_UP_SCHEDULED',
            description: `${type} follow-up scheduled for ${new Date(scheduledAt).toLocaleString()}`,
            metadataJson: { followUpId: followUp.id, type },
          },
        });
      }

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.followup.created',
        resourceType: 'follow_up',
        resourceId: followUp.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { type, scheduledAt, leadId, customerId },
      });

      res.status(201).json({ data: followUp, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Complete follow-up
router.post(
  '/:id/complete',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.followups.manage'),
  validateRequest({ body: CompleteFollowUpSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const followUp = await prisma.followUp.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!followUp) throw new NotFoundError('Follow-up not found');

      if (followUp.status !== 'PENDING') {
        throw new AppError('Follow-up is not pending', 400, 'INVALID_STATUS');
      }

      const updated = await prisma.followUp.update({
        where: { id: followUp.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          outcome: req.body.outcome ?? null,
          notes: req.body.notes ?? followUp.notes,
        },
      });

      // Update lead last-contacted date
      if (followUp.leadId) {
        await prisma.lead.update({
          where: { id: followUp.leadId },
          data: { lastContactedDate: new Date() },
        });

        await prisma.leadActivity.create({
          data: {
            organisationId: orgId,
            leadId: followUp.leadId,
            actorUserId: req.auth!.userId,
            activityType: 'FOLLOW_UP_COMPLETED',
            description: `${followUp.type} follow-up completed`,
            metadataJson: { followUpId: followUp.id, outcome: req.body.outcome },
          },
        });
      }

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Cancel follow-up
router.post(
  '/:id/cancel',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.followups.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const followUp = await prisma.followUp.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!followUp) throw new NotFoundError('Follow-up not found');

      if (followUp.status !== 'PENDING') {
        throw new AppError('Only pending follow-ups can be cancelled', 400, 'INVALID_STATUS');
      }

      const updated = await prisma.followUp.update({
        where: { id: followUp.id },
        data: { status: 'CANCELLED' },
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const followUpRoutes = router;
