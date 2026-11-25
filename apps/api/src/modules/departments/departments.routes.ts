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

const CreateDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(1).max(30),
  parentDepartmentId: z.string().uuid().nullable().optional(),
});

const UpdateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(1).max(30).optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('departments.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await prisma.department.findMany({
        where: { organisationId: req.auth!.organisationId! },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ data: departments, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('departments.manage'),
  validateRequest({ body: CreateDepartmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const dept = await prisma.department.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          code: req.body.code.toUpperCase(),
          parentDepartmentId: req.body.parentDepartmentId ?? null,
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'department.created',
        resourceType: 'department',
        resourceId: dept.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: dept,
      });

      res.status(201).json({ data: dept, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('departments.manage'),
  validateRequest({ body: UpdateDepartmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.department.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Department not found');

      const updated = await prisma.department.update({
        where: { id: existing.id },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'department.updated',
        resourceType: 'department',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: existing,
        afterJson: updated,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const departmentRoutes = router;
