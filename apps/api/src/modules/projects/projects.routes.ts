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
import { AppError, BadRequestError, NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';
import { checkProjectAccess } from './project-scope.js';

const router = Router();

// Validation Schemas
const CreateProjectSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  projectCategory: z.enum([
    'RESIDENTIAL_INTERIOR',
    'RESIDENTIAL_CONSTRUCTION',
    'COMMERCIAL_INTERIOR',
    'COMMERCIAL_CONSTRUCTION',
    'RENOVATION',
    'TURNKEY',
  ]),
  siteAddress: z.string().max(255).optional(),
  customerId: z.string().uuid().optional(),
  projectManagerId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  sourceQuotationId: z.string().uuid().optional(),
  allowDuplicateFromQuotation: z.boolean().default(false),
  allowDuplicate: z.boolean().optional(),
});

const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  manualProgressOverride: z.boolean().optional(),
});

const AssignProjectManagerSchema = z.object({
  projectManagerId: z.string().uuid().nullable(),
  reason: z.string().max(255).optional(),
});

const ProjectMembershipSchema = z.object({
  userId: z.string().uuid(),
  projectRole: z.enum([
    'PROJECT_MANAGER',
    'SITE_ENGINEER',
    'ARCHITECT_DESIGNER',
    'QA_QC',
    'CONSULTANT',
  ]).optional(),
  role: z.enum([
    'PROJECT_MANAGER',
    'SITE_ENGINEER',
    'ARCHITECT_DESIGNER',
    'QA_QC',
    'CONSULTANT',
  ]).optional(),
});

async function generateProjectNumber(organisationId: string): Promise<string> {
  const count = await prisma.project.count({ where: { organisationId } });
  return `PRJ-${String(count + 1).padStart(5, '0')}`;
}

// ------------------------------------------------------------------------------
// 1. DASHBOARD & METRICS
// ------------------------------------------------------------------------------
router.get(
  '/dashboard/metrics',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];
      const hasViewAll = permissions.includes('projects.view_all') || permissions.includes('organisation.manage');

      // Base filter for scoping
      const baseFilter: any = { organisationId: orgId };
      if (!hasViewAll) {
        baseFilter.OR = [
          { projectManagerId: userId },
          { memberships: { some: { userId, status: 'ACTIVE' } } },
        ];
      }

      const [allProjects, tasks, milestones] = await Promise.all([
        prisma.project.findMany({
          where: baseFilter,
          include: {
            projectManager: { select: { id: true, name: true } },
          },
        }),
        prisma.projectTask.findMany({
          where: {
            organisationId: orgId,
            project: baseFilter,
          },
          select: { id: true, status: true, dueDate: true, priority: true },
        }),
        prisma.projectMilestone.findMany({
          where: {
            organisationId: orgId,
            project: baseFilter,
          },
          select: { id: true, status: true, plannedEndDate: true },
        }),
      ]);

      const now = new Date();
      const totalProjects = allProjects.length;
      const activeProjects = allProjects.filter((p) => p.status === 'IN_PROGRESS').length;
      const notStartedProjects = allProjects.filter((p) => p.status === 'NOT_STARTED').length;
      const completedProjects = allProjects.filter((p) => p.status === 'COMPLETED').length;
      const onHoldProjects = allProjects.filter((p) => p.status === 'ON_HOLD').length;
      const delayedProjects = allProjects.filter(
        (p) =>
          p.status === 'IN_PROGRESS' &&
          p.expectedEndDate &&
          new Date(p.expectedEndDate) < now,
      ).length;

      const overdueTasks = tasks.filter(
        (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < now,
      ).length;

      const upcomingMilestones = milestones.filter(
        (m) =>
          m.status !== 'COMPLETED' &&
          m.plannedEndDate &&
          new Date(m.plannedEndDate) >= now,
      ).length;

      // Group by Project Manager
      const pmMap: Record<string, { id: string; name: string; count: number }> = {};
      for (const p of allProjects) {
        const pmId = p.projectManagerId || 'unassigned';
        const pmName = p.projectManager?.name || 'Unassigned';
        if (!pmMap[pmId]) {
          pmMap[pmId] = { id: pmId, name: pmName, count: 0 };
        }
        pmMap[pmId].count += 1;
      }

      // Group by Category
      const catMap: Record<string, number> = {};
      for (const p of allProjects) {
        catMap[p.projectCategory] = (catMap[p.projectCategory] || 0) + 1;
      }

      res.status(200).json({
        data: {
          totalProjects,
          activeProjects,
          inProgressProjects: activeProjects,
          notStartedProjects,
          plannedProjects: notStartedProjects,
          completedProjects,
          onHoldProjects,
          delayedProjects,
          overdueTasks,
          upcomingMilestones,
          byProjectManager: Object.values(pmMap),
          byCategory: catMap,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 2. LIST PROJECTS
// ------------------------------------------------------------------------------
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];
      const hasViewAll = permissions.includes('projects.view_all') || permissions.includes('organisation.manage');

      const { status, category, projectManagerId, search, limit = '50', offset = '0' } = req.query;

      const where: any = { organisationId: orgId };

      if (!hasViewAll) {
        where.OR = [
          { projectManagerId: userId },
          { memberships: { some: { userId, status: 'ACTIVE' } } },
        ];
      }

      if (status && typeof status === 'string') {
        where.status = status;
      }
      if (category && typeof category === 'string') {
        where.projectCategory = category;
      }
      if (projectManagerId && typeof projectManagerId === 'string') {
        where.projectManagerId = projectManagerId;
      }
      if (search && typeof search === 'string') {
        where.AND = [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { projectNumber: { contains: search, mode: 'insensitive' } },
              { siteAddress: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            projectManager: { select: { id: true, name: true, email: true } },
            _count: { select: { milestones: true, tasks: true, documents: true, memberships: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: offsetNum,
          take: limitNum,
        }),
        prisma.project.count({ where }),
      ]);

      res.status(200).json({
        data: projects,
        meta: {
          total,
          limit: limitNum,
          offset: offsetNum,
          totalPages: Math.ceil(total / limitNum),
          requestId: req.id,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 3. CREATE PROJECT (FROM ACCEPTED QUOTATION OR DIRECT)
// ------------------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.create'),
  validateRequest({ body: CreateProjectSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const {
        name,
        description,
        projectCategory,
        siteAddress,
        customerId,
        projectManagerId,
        priority,
        startDate,
        expectedEndDate,
        sourceQuotationId,
        allowDuplicateFromQuotation,
        allowDuplicate,
      } = req.body;
      const isDuplicateAllowed = Boolean(allowDuplicateFromQuotation || allowDuplicate);

      let frozenQuotationNumber: string | null = null;
      let frozenQuotationRevision: number | null = null;
      let budgetBaselineAmount = 0;
      let approvedBoqSnapshot: any = null;
      let derivedCustomerId = customerId;

      if (sourceQuotationId) {
        const quotation = await prisma.quotation.findFirst({
          where: { id: sourceQuotationId, organisationId: orgId },
          include: {
            estimate: {
              include: {
                sections: { include: { items: true } },
              },
            },
          },
        });

        if (!quotation) {
          throw new NotFoundError('Source quotation not found in this organisation.');
        }

        // Prevent duplicate project creation from same accepted quotation unless explicitly authorized
        if (!isDuplicateAllowed) {
          const existingProject = await prisma.project.findFirst({
            where: {
              organisationId: orgId,
              sourceQuotationId: quotation.id,
              sourceQuotationRevision: quotation.revisionNumber,
            },
          });
          if (existingProject) {
            throw new AppError(
              `A project (${existingProject.projectNumber}) has already been created from Quotation ${quotation.quotationNumber} (Rev ${quotation.revisionNumber}). Duplicate creation without authorization is prevented.`,
              409,
              'DUPLICATE_PROJECT_QUOTATION',
            );
          }
        }

        frozenQuotationNumber = quotation.quotationNumber;
        frozenQuotationRevision = quotation.revisionNumber;
        budgetBaselineAmount = quotation.grandTotal ? Number(quotation.grandTotal) : 0;
        derivedCustomerId = derivedCustomerId || quotation.customerId;

        // Freeze copy of the BOQ sections and items
        approvedBoqSnapshot = {
          quotationNumber: quotation.quotationNumber,
          revisionNumber: quotation.revisionNumber,
          estimateNumber: quotation.estimate.estimateNumber,
          subtotal: Number(quotation.subtotal),
          discountAmount: Number(quotation.discountAmount),
          taxAmount: Number(quotation.taxAmount),
          grandTotal: Number(quotation.grandTotal),
          sections: quotation.estimate.sections.map((s) => ({
            title: s.title,
            items: s.items.map((i) => ({
              description: i.description,
              materialQty: Number(i.materialQty),
              materialRate: Number(i.materialRate),
              materialTotal: Number(i.materialTotal),
              labourQty: Number(i.labourQty),
              labourRate: Number(i.labourRate),
              labourTotal: Number(i.labourTotal),
              otherCharges: Number(i.otherCharges),
              itemTotal: Number(i.itemTotal),
            })),
          })),
        };
      }

      const projectNumber = await generateProjectNumber(orgId);

      const project = await prisma.$transaction(async (tx) => {
        const p = await tx.project.create({
          data: {
            organisationId: orgId,
            projectNumber,
            name,
            description: description ?? null,
            projectCategory,
            siteAddress: siteAddress ?? null,
            customerId: derivedCustomerId ?? null,
            projectManagerId: projectManagerId ?? null,
            priority,
            startDate: startDate ? new Date(startDate) : null,
            expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
            sourceQuotationId: sourceQuotationId ?? null,
            sourceQuotationNumber: frozenQuotationNumber,
            sourceQuotationRevision: frozenQuotationRevision,
            budgetBaselineAmount,
            approvedBoqSnapshot: approvedBoqSnapshot ?? undefined,
            createdByUserId: req.auth!.userId,
          },
        });

        // If a PM is specified, auto-add to project memberships
        if (projectManagerId) {
          await tx.projectMembership.create({
            data: {
              organisationId: orgId,
              projectId: p.id,
              userId: projectManagerId,
              projectRole: 'PROJECT_MANAGER',
              status: 'ACTIVE',
            },
          });
        }

        // Record initial activity
        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId: p.id,
            actorUserId: req.auth!.userId,
            action: 'project.created',
            description: `Project ${p.projectNumber} created${frozenQuotationNumber ? ` from Quotation ${frozenQuotationNumber} (Rev ${frozenQuotationRevision})` : ''}.`,
          },
        });

        return p;
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'project.created',
        resourceType: 'project',
        resourceId: project.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { projectNumber, name, sourceQuotationNumber: frozenQuotationNumber },
      });

      res.status(201).json({ success: true, data: project, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 4. GET PROJECT DETAILS
// ------------------------------------------------------------------------------
router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.id, userId, permissions);
      if (!scope.projectExists) {
        throw new NotFoundError('Project not found');
      }
      if (!scope.hasAccess) {
        throw new ForbiddenError('Access denied to this project.');
      }

      const project = await prisma.project.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          customer: true,
          projectManager: { select: { id: true, name: true, email: true, phone: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          sourceQuotation: { select: { id: true, quotationNumber: true, revisionNumber: true, status: true, grandTotal: true } },
          memberships: {
            where: { status: 'ACTIVE' },
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
          milestones: {
            orderBy: { sequenceOrder: 'asc' },
            include: {
              responsibleUser: { select: { id: true, name: true } },
              _count: { select: { tasks: true } },
            },
          },
          _count: { select: { tasks: true, documents: true, activities: true } },
        },
      });

      if (!project) throw new NotFoundError('Project not found');

      res.status(200).json({ data: project, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 5. UPDATE PROJECT
// ------------------------------------------------------------------------------
router.put(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.update'),
  validateRequest({ body: UpdateProjectSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.id, userId, permissions);
      if (!scope.hasAccess) {
        throw new ForbiddenError('You are not authorised to update this project.');
      }

      const existing = await prisma.project.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Project not found');

      const dataToUpdate: any = {};
      if (req.body.name) dataToUpdate.name = req.body.name;
      if (req.body.description !== undefined) dataToUpdate.description = req.body.description;
      if (req.body.projectCategory) dataToUpdate.projectCategory = req.body.projectCategory;
      if (req.body.siteAddress !== undefined) dataToUpdate.siteAddress = req.body.siteAddress;
      if (req.body.status) dataToUpdate.status = req.body.status;
      if (req.body.priority) dataToUpdate.priority = req.body.priority;
      if (req.body.startDate !== undefined) dataToUpdate.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
      if (req.body.expectedEndDate !== undefined) dataToUpdate.expectedEndDate = req.body.expectedEndDate ? new Date(req.body.expectedEndDate) : null;
      if (req.body.progressPercentage !== undefined) {
        dataToUpdate.progressPercentage = req.body.progressPercentage;
        dataToUpdate.manualProgressOverride = true;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const p = await tx.project.update({
          where: { id: existing.id },
          data: dataToUpdate,
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId: p.id,
            actorUserId: userId,
            action: 'project.updated',
            description: `Project details updated.`,
          },
        });

        return p;
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 6. ASSIGN OR REASSIGN PROJECT MANAGER
// ------------------------------------------------------------------------------
const handleAssignProjectManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.auth!.organisationId!;
    const { projectManagerId, reason } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organisationId: orgId },
    });
    if (!project) throw new NotFoundError('Project not found');

    let pmUser: any = null;
    if (projectManagerId) {
      pmUser = await prisma.user.findFirst({
        where: { id: projectManagerId, organisationId: orgId, status: 'ACTIVE' },
      });
      if (!pmUser) throw new NotFoundError('Project Manager user not found or inactive');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: project.id },
        data: { projectManagerId: projectManagerId ?? null },
      });

      if (projectManagerId) {
        // Upsert project membership as PROJECT_MANAGER
        await tx.projectMembership.upsert({
          where: {
            organisationId_projectId_userId: {
              organisationId: orgId,
              projectId: p.id,
              userId: projectManagerId,
            },
          },
          create: {
            organisationId: orgId,
            projectId: p.id,
            userId: projectManagerId,
            projectRole: 'PROJECT_MANAGER',
            status: 'ACTIVE',
          },
          update: {
            projectRole: 'PROJECT_MANAGER',
            status: 'ACTIVE',
          },
        });
      }

      await tx.projectActivity.create({
        data: {
          organisationId: orgId,
          projectId: p.id,
          actorUserId: req.auth!.userId,
          action: 'project.manager_assigned',
          description: pmUser
            ? `Project Manager assigned: ${pmUser.name}.${reason ? ` Reason: ${reason}` : ''}`
            : `Project Manager unassigned.${reason ? ` Reason: ${reason}` : ''}`,
        },
      });

      return p;
    });

    res.status(200).json({ success: true, data: updated, meta: { requestId: req.id } });
  } catch (err) {
    next(err);
  }
};

router.post(
  '/:id/assign-manager',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.assign'),
  validateRequest({ body: AssignProjectManagerSchema }),
  handleAssignProjectManager,
);

router.put(
  '/:id/project-manager',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.assign'),
  validateRequest({ body: AssignProjectManagerSchema }),
  handleAssignProjectManager,
);

// ------------------------------------------------------------------------------
// 7. PROJECT MEMBERSHIPS & TEAM ASSIGNMENT
// ------------------------------------------------------------------------------
const handleAddMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.auth!.organisationId!;
    const { userId } = req.body;
    const projectRole = req.body.projectRole || req.body.role;
    if (!projectRole) throw new BadRequestError('Project role is required');

    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organisationId: orgId },
    });
    if (!project) throw new NotFoundError('Project not found');

    const user = await prisma.user.findFirst({
      where: { id: userId, organisationId: orgId, status: 'ACTIVE' },
    });
    if (!user) throw new NotFoundError('User not found or inactive');

    const membership = await prisma.projectMembership.upsert({
      where: {
        organisationId_projectId_userId: {
          organisationId: orgId,
          projectId: project.id,
          userId,
        },
      },
      create: {
        organisationId: orgId,
        projectId: project.id,
        userId,
        projectRole,
        status: 'ACTIVE',
      },
      update: {
        projectRole,
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.projectActivity.create({
      data: {
        organisationId: orgId,
        projectId: project.id,
        actorUserId: req.auth!.userId,
        action: 'project.member_assigned',
        description: `${user.name} assigned as ${projectRole}.`,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...membership,
        role: membership.projectRole,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
};

router.post(
  '/:id/members',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.membership.manage'),
  validateRequest({ body: ProjectMembershipSchema }),
  handleAddMember,
);

router.post(
  '/:id/memberships',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.membership.manage'),
  validateRequest({ body: ProjectMembershipSchema }),
  handleAddMember,
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.membership.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { id: projectId, userId } = req.params;

      const membership = await prisma.projectMembership.findFirst({
        where: { organisationId: orgId, projectId, userId },
      });
      if (!membership) throw new NotFoundError('Membership not found');

      await prisma.projectMembership.update({
        where: { id: membership.id },
        data: { status: 'REVOKED' },
      });

      res.status(200).json({ success: true, message: 'Member access revoked.' });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 8. PROJECT ACTIVITY TIMELINE
// ------------------------------------------------------------------------------
router.get(
  '/:id/activities',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.id, userId, permissions);
      if (!scope.hasAccess) throw new ForbiddenError('Not authorised to view activities.');

      const activities = await prisma.projectActivity.findMany({
        where: { projectId: req.params.id, organisationId: orgId },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.status(200).json({ success: true, data: activities, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// 9. SUB-RESOURCE ALIAS ROUTES FOR CONVENIENT PROJECT-SCOPED ACCESS
// ------------------------------------------------------------------------------

// Apply template to project
router.post(
  '/:id/apply-template',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.milestones.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { templateId } = req.body;
      if (!templateId) throw new BadRequestError('templateId is required');

      const template = await prisma.projectMilestoneTemplate.findFirst({
        where: { id: templateId, organisationId: orgId },
      });
      if (!template) throw new NotFoundError('Milestone template not found');

      const project = await prisma.project.findFirst({
        where: { id: req.params.id, organisationId: orgId },
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

      res.status(200).json({
        success: true,
        data: {
          milestones: createdMilestones,
          appliedMilestonesCount: createdMilestones.length,
        },
        message: `Applied ${createdMilestones.length} milestones from template.`,
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Get milestones for project
router.get(
  '/:id/milestones',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.id, userId, permissions);
      if (!scope.hasAccess) throw new ForbiddenError('Not authorised to view milestones.');

      const milestones = await prisma.projectMilestone.findMany({
        where: { projectId: req.params.id, organisationId: orgId },
        include: {
          responsibleUser: { select: { id: true, name: true, email: true } },
          predecessor: { select: { id: true, name: true, status: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { sequenceOrder: 'asc' },
      });

      res.status(200).json({ success: true, data: milestones, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Create task for project
router.post(
  '/:id/tasks',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.tasks.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const {
        milestoneId,
        title,
        description,
        status = 'TODO',
        priority = 'MEDIUM',
        assigneeId,
        assigneeUserId,
        startDate,
        dueDate,
      } = req.body;

      const project = await prisma.project.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!project) throw new NotFoundError('Project not found');

      const assignedUser = assigneeUserId || assigneeId || null;

      const task = await prisma.$transaction(async (tx) => {
        const t = await tx.projectTask.create({
          data: {
            organisationId: orgId,
            projectId: project.id,
            milestoneId: milestoneId ?? null,
            title,
            description: description ?? null,
            status,
            priority,
            assigneeUserId: assignedUser,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            completedAt: status === 'COMPLETED' ? new Date() : null,
            createdByUserId: req.auth!.userId,
          },
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId: project.id,
            actorUserId: req.auth!.userId,
            action: 'task.created',
            description: `Task "${t.title}" created.`,
          },
        });

        return t;
      });

      res.status(201).json({
        success: true,
        data: {
          ...task,
          assigneeId: task.assigneeUserId,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Get documents for project
router.get(
  '/:id/documents',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.documents.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.id, userId, permissions);
      if (!scope.hasAccess) throw new ForbiddenError('Not authorised to view project documents.');

      const { category } = req.query;
      const where: any = { projectId: req.params.id, organisationId: orgId };
      if (category && typeof category === 'string') where.category = category;

      const documents = await prisma.projectDocument.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, data: documents, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Upload / register document for project
router.post(
  '/:id/documents',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.documents.upload'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const {
        title,
        category,
        fileName = 'document.pdf',
        fileSize = 1024,
        mimeType = 'application/pdf',
        fileUrl,
        description,
      } = req.body;

      const project = await prisma.project.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!project) throw new NotFoundError('Project not found');

      const doc = await prisma.$transaction(async (tx) => {
        const d = await tx.projectDocument.create({
          data: {
            organisationId: orgId,
            projectId: project.id,
            title,
            category,
            fileName,
            fileSize: Number(fileSize),
            mimeType,
            fileUrl,
            description: description ?? null,
            uploadedByUserId: req.auth!.userId,
          },
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId: project.id,
            actorUserId: req.auth!.userId,
            action: 'document.uploaded',
            description: `Document "${d.title}" (${d.category}) uploaded.`,
          },
        });

        return d;
      });

      res.status(201).json({ success: true, data: doc, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
