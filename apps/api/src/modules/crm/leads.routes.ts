import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
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

// --------------- Schemas ---------------

const CreateLeadSchema = z.object({
  customerName: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  location: z.string().max(300).optional(),
  propertyType: z.string().max(100).optional(),
  projectCategory: z.string().max(100).optional(),
  requirements: z.string().max(5000).optional(),
  estimatedBudget: z.number().positive().optional(),
  expectedStartDate: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  pipelineStageId: z.string().uuid().optional(),
});

const UpdateLeadSchema = z.object({
  customerName: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  propertyType: z.string().max(100).nullable().optional(),
  projectCategory: z.string().max(100).nullable().optional(),
  requirements: z.string().max(5000).nullable().optional(),
  estimatedBudget: z.number().positive().nullable().optional(),
  expectedStartDate: z.string().nullable().optional(),
  sourceId: z.string().uuid().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  lastContactedDate: z.string().optional(),
  nextFollowUpDate: z.string().nullable().optional(),
});

const AssignLeadSchema = z.object({
  assignedUserId: z.string().uuid(),
  remarks: z.string().max(500).optional(),
});

const ChangeStageSchema = z.object({
  pipelineStageId: z.string().uuid(),
  remarks: z.string().max(500).optional(),
});

const MarkLostSchema = z.object({
  lostReasonId: z.string().uuid().optional(),
  lostRemarks: z.string().max(1000).optional(),
});

const ListLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  pipelineStageId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'customerName', 'priority', 'estimatedBudget', 'nextFollowUpDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// --------------- Helpers ---------------

async function generateLeadNumber(orgId: string): Promise<string> {
  const count = await prisma.lead.count({ where: { organisationId: orgId } });
  return `LD-${String(count + 1).padStart(5, '0')}`;
}

async function recordLeadActivity(params: {
  organisationId: string;
  leadId: string;
  actorUserId?: string | null;
  activityType: string;
  description: string;
  metadataJson?: Prisma.InputJsonValue;
}) {
  await prisma.leadActivity.create({
    data: {
      organisationId: params.organisationId,
      leadId: params.leadId,
      actorUserId: params.actorUserId ?? null,
      activityType: params.activityType,
      description: params.description,
      metadataJson: params.metadataJson ?? undefined,
    },
  });
}

// --------------- Routes ---------------

// List leads with search, filter, sort, pagination
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.view'),
  validateRequest({ query: ListLeadsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { page, limit, search, status, priority, pipelineStageId, assignedUserId, sourceId, sortBy, sortOrder } = req.query as unknown as z.infer<typeof ListLeadsQuerySchema>;

      const where: Prisma.LeadWhereInput = { organisationId: orgId };

      if (search) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { leadNumber: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (pipelineStageId) where.pipelineStageId = pipelineStageId;
      if (assignedUserId) where.assignedUserId = assignedUserId;
      if (sourceId) where.sourceId = sourceId;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            source: { select: { id: true, name: true, code: true } },
            assignedUser: { select: { id: true, name: true, email: true } },
            pipelineStage: { select: { id: true, name: true, code: true, color: true, isTerminal: true } },
            lostReason: { select: { id: true, name: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.lead.count({ where }),
      ]);

      res.status(200).json({
        data: leads,
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

// Get single lead with full details
router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          source: { select: { id: true, name: true, code: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          pipelineStage: { select: { id: true, name: true, code: true, color: true, isTerminal: true, order: true } },
          lostReason: { select: { id: true, name: true } },
          stageHistory: {
            include: {
              fromStage: { select: { id: true, name: true, code: true } },
              toStage: { select: { id: true, name: true, code: true } },
            },
            orderBy: { occurredAt: 'desc' },
            take: 50,
          },
          assignments: {
            include: {
              assignedTo: { select: { id: true, name: true, email: true } },
              assignedBy: { select: { id: true, name: true } },
            },
            orderBy: { assignedAt: 'desc' },
            take: 20,
          },
          followUps: {
            include: {
              assignedUser: { select: { id: true, name: true } },
            },
            orderBy: { scheduledAt: 'desc' },
            take: 20,
          },
          siteVisits: {
            include: {
              assignedUser: { select: { id: true, name: true } },
            },
            orderBy: { visitDate: 'desc' },
            take: 20,
          },
          customer: { select: { id: true, customerNumber: true, name: true } },
        },
      });

      if (!lead) throw new NotFoundError('Lead not found');

      res.status(200).json({ data: lead, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Create lead
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.create'),
  validateRequest({ body: CreateLeadSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const data = req.body;

      // Duplicate detection: same name + phone in same org
      if (data.phone) {
        const duplicate = await prisma.lead.findFirst({
          where: {
            organisationId: orgId,
            customerName: { equals: data.customerName, mode: 'insensitive' },
            phone: data.phone,
            status: { not: 'ARCHIVED' },
          },
        });
        if (duplicate) {
          throw new AppError(
            `A lead with the same name and phone already exists (${duplicate.leadNumber})`,
            409,
            'DUPLICATE_LEAD',
          );
        }
      }

      // If no pipeline stage specified, assign first non-terminal stage
      let pipelineStageId = data.pipelineStageId;
      if (!pipelineStageId) {
        const firstStage = await prisma.leadPipelineStage.findFirst({
          where: { organisationId: orgId, isActive: true, isTerminal: false },
          orderBy: { order: 'asc' },
        });
        if (firstStage) pipelineStageId = firstStage.id;
      }

      const leadNumber = await generateLeadNumber(orgId);

      const lead = await prisma.lead.create({
        data: {
          organisationId: orgId,
          leadNumber,
          customerName: data.customerName,
          phone: data.phone ?? null,
          email: data.email ?? null,
          location: data.location ?? null,
          propertyType: data.propertyType ?? null,
          projectCategory: data.projectCategory ?? null,
          requirements: data.requirements ?? null,
          estimatedBudget: data.estimatedBudget ?? null,
          expectedStartDate: data.expectedStartDate ? new Date(data.expectedStartDate) : null,
          sourceId: data.sourceId ?? null,
          assignedUserId: data.assignedUserId ?? null,
          priority: data.priority,
          status: 'OPEN',
          pipelineStageId: pipelineStageId ?? null,
          createdByUserId: req.auth!.userId,
        },
        include: {
          source: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, name: true } },
          pipelineStage: { select: { id: true, name: true, code: true } },
        },
      });

      // Record initial stage history
      if (pipelineStageId) {
        await prisma.leadStageHistory.create({
          data: {
            leadId: lead.id,
            fromStageId: null,
            toStageId: pipelineStageId,
            changedByUserId: req.auth!.userId,
            remarks: 'Initial stage on creation',
          },
        });
      }

      // Record initial assignment
      if (data.assignedUserId) {
        await prisma.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToUserId: data.assignedUserId,
            assignedByUserId: req.auth!.userId,
            remarks: 'Initial assignment on creation',
          },
        });
      }

      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: 'CREATED',
        description: `Lead ${leadNumber} created for ${data.customerName}`,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead.created',
        resourceType: 'lead',
        resourceId: lead.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { leadNumber, customerName: data.customerName, priority: data.priority },
      });

      res.status(201).json({ data: lead, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Update lead
router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.update'),
  validateRequest({ body: UpdateLeadSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Lead not found');

      const updateData: Record<string, unknown> = { ...req.body };

      if (updateData.expectedStartDate !== undefined) {
        updateData.expectedStartDate = updateData.expectedStartDate ? new Date(updateData.expectedStartDate as string) : null;
      }
      if (updateData.lastContactedDate !== undefined) {
        updateData.lastContactedDate = updateData.lastContactedDate ? new Date(updateData.lastContactedDate as string) : null;
      }
      if (updateData.nextFollowUpDate !== undefined) {
        updateData.nextFollowUpDate = updateData.nextFollowUpDate ? new Date(updateData.nextFollowUpDate as string) : null;
      }

      const updated = await prisma.lead.update({
        where: { id: existing.id },
        data: updateData as Prisma.LeadUpdateInput,
        include: {
          source: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, name: true } },
          pipelineStage: { select: { id: true, name: true, code: true } },
        },
      });

      await recordLeadActivity({
        organisationId: orgId,
        leadId: existing.id,
        actorUserId: req.auth!.userId,
        activityType: 'UPDATED',
        description: `Lead ${existing.leadNumber} updated`,
        metadataJson: { updatedFields: Object.keys(req.body) },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead.updated',
        resourceType: 'lead',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Assign / Reassign lead
router.post(
  '/:id/assign',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.assign'),
  validateRequest({ body: AssignLeadSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: { assignedUser: { select: { id: true, name: true } } },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      const targetUser = await prisma.user.findFirst({
        where: { id: req.body.assignedUserId, organisationId: orgId, status: 'ACTIVE' },
      });
      if (!targetUser) throw new NotFoundError('Target user not found or inactive');

      const previousAssignee = lead.assignedUser;

      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lead.id },
          data: { assignedUserId: targetUser.id },
        });

        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToUserId: targetUser.id,
            assignedByUserId: req.auth!.userId,
            remarks: req.body.remarks ?? null,
          },
        });
      });

      const action = previousAssignee ? 'REASSIGNED' : 'ASSIGNED';
      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: action,
        description: previousAssignee
          ? `Lead reassigned from ${previousAssignee.name} to ${targetUser.name}`
          : `Lead assigned to ${targetUser.name}`,
        metadataJson: {
          previousAssignee: previousAssignee ? { id: previousAssignee.id, name: previousAssignee.name } : null,
          newAssignee: { id: targetUser.id, name: targetUser.name },
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: `crm.lead.${action.toLowerCase()}`,
        resourceType: 'lead',
        resourceId: lead.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { assignedUserId: targetUser.id, assignedUserName: targetUser.name },
      });

      res.status(200).json({
        data: { leadId: lead.id, assignedUserId: targetUser.id, assignedUserName: targetUser.name },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Change pipeline stage
router.post(
  '/:id/stage',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.update'),
  validateRequest({ body: ChangeStageSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: { pipelineStage: { select: { id: true, name: true, code: true, isTerminal: true } } },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      if (lead.status === 'WON' || lead.status === 'LOST') {
        throw new AppError('Cannot change stage of a closed lead. Reopen it first.', 400, 'LEAD_CLOSED');
      }

      const newStage = await prisma.leadPipelineStage.findFirst({
        where: { id: req.body.pipelineStageId, organisationId: orgId, isActive: true },
      });
      if (!newStage) throw new NotFoundError('Pipeline stage not found');

      await prisma.$transaction(async (tx) => {
        const updateData: Prisma.LeadUpdateInput = { pipelineStage: { connect: { id: newStage.id } } };

        // If moving to a terminal "Won" stage
        if (newStage.isTerminal && newStage.code === 'WON') {
          updateData.status = 'WON';
        }
        // If moving to a terminal "Lost" stage
        if (newStage.isTerminal && newStage.code === 'LOST') {
          updateData.status = 'LOST';
        }

        await tx.lead.update({ where: { id: lead.id }, data: updateData });

        await tx.leadStageHistory.create({
          data: {
            leadId: lead.id,
            fromStageId: lead.pipelineStageId,
            toStageId: newStage.id,
            changedByUserId: req.auth!.userId,
            remarks: req.body.remarks ?? null,
          },
        });
      });

      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: 'STAGE_CHANGED',
        description: `Stage changed from "${lead.pipelineStage?.name ?? 'None'}" to "${newStage.name}"`,
        metadataJson: {
          fromStage: lead.pipelineStage ? { id: lead.pipelineStage.id, name: lead.pipelineStage.name } : null,
          toStage: { id: newStage.id, name: newStage.name },
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead.stage_changed',
        resourceType: 'lead',
        resourceId: lead.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { stageId: newStage.id, stageName: newStage.name },
      });

      res.status(200).json({
        data: { leadId: lead.id, pipelineStageId: newStage.id, stageName: newStage.name },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Mark lead as lost
router.post(
  '/:id/lost',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.update'),
  validateRequest({ body: MarkLostSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      if (lead.status === 'WON') {
        throw new AppError('Cannot mark a won lead as lost', 400, 'LEAD_ALREADY_WON');
      }

      // Find or use Lost terminal stage
      const lostStage = await prisma.leadPipelineStage.findFirst({
        where: { organisationId: orgId, code: 'LOST', isActive: true },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'LOST',
          lostReasonId: req.body.lostReasonId ?? null,
          lostRemarks: req.body.lostRemarks ?? null,
          pipelineStageId: lostStage?.id ?? lead.pipelineStageId,
        },
      });

      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: 'STATUS_CHANGED',
        description: `Lead marked as Lost`,
        metadataJson: { previousStatus: lead.status, newStatus: 'LOST', lostReasonId: req.body.lostReasonId },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead.lost',
        resourceType: 'lead',
        resourceId: lead.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { status: 'LOST', lostReasonId: req.body.lostReasonId },
      });

      res.status(200).json({
        data: { leadId: lead.id, status: 'LOST' },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Archive lead
router.post(
  '/:id/archive',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });

      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: 'STATUS_CHANGED',
        description: 'Lead archived',
        metadataJson: { previousStatus: lead.status, newStatus: 'ARCHIVED' },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead.archived',
        resourceType: 'lead',
        resourceId: lead.id,
        requestId: req.id,
        ipAddress: req.ip,
      });

      res.status(200).json({
        data: { leadId: lead.id, status: 'ARCHIVED' },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Restore archived lead
router.post(
  '/:id/restore',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      if (lead.status !== 'ARCHIVED') {
        throw new AppError('Only archived leads can be restored', 400, 'NOT_ARCHIVED');
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'OPEN', archivedAt: null },
      });

      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: 'STATUS_CHANGED',
        description: 'Lead restored from archive',
        metadataJson: { previousStatus: 'ARCHIVED', newStatus: 'OPEN' },
      });

      res.status(200).json({
        data: { leadId: lead.id, status: 'OPEN' },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Convert lead to customer
router.post(
  '/:id/convert',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.convert'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: { customer: true },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      if (lead.customer) {
        throw new AppError('Lead has already been converted to a customer', 400, 'ALREADY_CONVERTED');
      }

      if (lead.status === 'LOST' || lead.status === 'ARCHIVED') {
        throw new AppError('Cannot convert a lost or archived lead', 400, 'LEAD_CLOSED');
      }

      // Generate customer number
      const custCount = await prisma.customer.count({ where: { organisationId: orgId } });
      const customerNumber = `CUST-${String(custCount + 1).padStart(5, '0')}`;

      // Find Won stage
      const wonStage = await prisma.leadPipelineStage.findFirst({
        where: { organisationId: orgId, code: 'WON', isActive: true },
      });

      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            organisationId: orgId,
            customerNumber,
            type: 'INDIVIDUAL',
            name: lead.customerName,
            phone: lead.phone,
            email: lead.email,
            convertedFromLeadId: lead.id,
            createdByUserId: req.auth!.userId,
          },
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'WON',
            pipelineStageId: wonStage?.id ?? lead.pipelineStageId,
          },
        });

        return customer;
      });

      if (wonStage && wonStage.id !== lead.pipelineStageId) {
        await prisma.leadStageHistory.create({
          data: {
            leadId: lead.id,
            fromStageId: lead.pipelineStageId,
            toStageId: wonStage.id,
            changedByUserId: req.auth!.userId,
            remarks: 'Auto-moved to Won on conversion',
          },
        });
      }

      await recordLeadActivity({
        organisationId: orgId,
        leadId: lead.id,
        actorUserId: req.auth!.userId,
        activityType: 'CONVERTED',
        description: `Lead converted to customer ${customerNumber}`,
        metadataJson: { customerId: result.id, customerNumber },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.lead.converted',
        resourceType: 'lead',
        resourceId: lead.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { customerId: result.id, customerNumber, status: 'WON' },
      });

      res.status(201).json({
        data: { lead: { id: lead.id, status: 'WON' }, customer: result },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Get lead activity timeline
router.get(
  '/:id/activities',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.leads.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!lead) throw new NotFoundError('Lead not found');

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

      const [activities, total] = await Promise.all([
        prisma.leadActivity.findMany({
          where: { leadId: lead.id, organisationId: orgId },
          include: {
            actor: { select: { id: true, name: true } },
          },
          orderBy: { occurredAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.leadActivity.count({ where: { leadId: lead.id, organisationId: orgId } }),
      ]);

      res.status(200).json({
        data: activities,
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

export const leadRoutes = router;
