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

const CreateSiteVisitSchema = z.object({
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  visitDate: z.string().min(1),
  address: z.string().max(500).optional(),
  remarks: z.string().max(2000).optional(),
});

const CompleteSiteVisitSchema = z.object({
  remarks: z.string().max(2000).optional(),
});

// List site visits
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.site_visits.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = (req.query.status as string) || undefined;
      const assignedUserId = (req.query.assignedUserId as string) || undefined;

      const where: Record<string, unknown> = { organisationId: orgId };
      if (status) where.status = status;
      if (assignedUserId) where.assignedUserId = assignedUserId;

      const [siteVisits, total] = await Promise.all([
        prisma.siteVisit.findMany({
          where,
          include: {
            lead: { select: { id: true, leadNumber: true, customerName: true } },
            customer: { select: { id: true, customerNumber: true, name: true } },
            assignedUser: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            _count: { select: { attachments: true } },
          },
          orderBy: { visitDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.siteVisit.count({ where }),
      ]);

      res.status(200).json({
        data: siteVisits,
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

// Create site visit
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.site_visits.manage'),
  validateRequest({ body: CreateSiteVisitSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { leadId, customerId, assignedUserId, visitDate, address, remarks } = req.body;

      if (!leadId && !customerId) {
        throw new AppError('Either leadId or customerId is required', 400, 'MISSING_REFERENCE');
      }

      if (leadId) {
        const lead = await prisma.lead.findFirst({ where: { id: leadId, organisationId: orgId } });
        if (!lead) throw new NotFoundError('Lead not found');
      }
      if (customerId) {
        const customer = await prisma.customer.findFirst({ where: { id: customerId, organisationId: orgId } });
        if (!customer) throw new NotFoundError('Customer not found');
      }

      const siteVisit = await prisma.siteVisit.create({
        data: {
          organisationId: orgId,
          leadId: leadId ?? null,
          customerId: customerId ?? null,
          assignedUserId: assignedUserId ?? req.auth!.userId,
          visitDate: new Date(visitDate),
          address: address ?? null,
          remarks: remarks ?? null,
          status: 'SCHEDULED',
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
            activityType: 'SITE_VISIT_SCHEDULED',
            description: `Site visit scheduled for ${new Date(visitDate).toLocaleDateString()}`,
            metadataJson: { siteVisitId: siteVisit.id },
          },
        });
      }

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.site_visit.created',
        resourceType: 'site_visit',
        resourceId: siteVisit.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { visitDate, leadId, customerId },
      });

      res.status(201).json({ data: siteVisit, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Complete site visit
router.post(
  '/:id/complete',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.site_visits.manage'),
  validateRequest({ body: CompleteSiteVisitSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const siteVisit = await prisma.siteVisit.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!siteVisit) throw new NotFoundError('Site visit not found');

      if (siteVisit.status !== 'SCHEDULED') {
        throw new AppError('Site visit is not scheduled', 400, 'INVALID_STATUS');
      }

      const updated = await prisma.siteVisit.update({
        where: { id: siteVisit.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          remarks: req.body.remarks ?? siteVisit.remarks,
        },
      });

      if (siteVisit.leadId) {
        await prisma.leadActivity.create({
          data: {
            organisationId: orgId,
            leadId: siteVisit.leadId,
            actorUserId: req.auth!.userId,
            activityType: 'SITE_VISIT_COMPLETED',
            description: 'Site visit completed',
            metadataJson: { siteVisitId: siteVisit.id },
          },
        });
      }

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Cancel site visit
router.post(
  '/:id/cancel',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.site_visits.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const siteVisit = await prisma.siteVisit.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!siteVisit) throw new NotFoundError('Site visit not found');

      if (siteVisit.status !== 'SCHEDULED') {
        throw new AppError('Only scheduled site visits can be cancelled', 400, 'INVALID_STATUS');
      }

      const updated = await prisma.siteVisit.update({
        where: { id: siteVisit.id },
        data: { status: 'CANCELLED' },
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Get site visit details
router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.site_visits.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const siteVisit = await prisma.siteVisit.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          lead: { select: { id: true, leadNumber: true, customerName: true } },
          customer: { select: { id: true, customerNumber: true, name: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          attachments: {
            include: { uploadedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!siteVisit) throw new NotFoundError('Site visit not found');

      res.status(200).json({ data: siteVisit, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const siteVisitRoutes = router;
