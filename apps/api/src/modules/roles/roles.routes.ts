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
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import {
  PREDEFINED_ROLE_TEMPLATES,
  seedOrganisationRoleTemplates,
  resetRoleToTemplateDefaults,
} from '../../common/rbac/permissions-catalog.js';

const router = Router();

const CreateRoleSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  description: z.string().max(255).optional(),
  permissionCodes: z.array(z.string()).optional(),
});

const AssignPermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
});

/**
 * GET /api/v1/roles/templates
 * Returns predefined template definitions and default permission mappings.
 */
router.get(
  '/templates',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ data: PREDEFINED_ROLE_TEMPLATES, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/roles/seed-templates
 * Idempotently creates any missing predefined role templates for the organisation.
 * Preserves existing customized role permissions.
 */
router.post(
  '/seed-templates',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      await seedOrganisationRoleTemplates(orgId);

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'roles.seeded_templates',
        resourceType: 'organisation',
        resourceId: orgId,
        requestId: req.id,
        ipAddress: req.ip,
      });

      res.status(200).json({
        data: { message: 'Predefined role templates seeded successfully' },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/roles/:id/reset-defaults
 * Explicitly restores a predefined role's permissions to factory template defaults.
 */
router.post(
  '/:id/reset-defaults',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const role = await prisma.role.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!role) throw new NotFoundError('Role not found');

      const template = PREDEFINED_ROLE_TEMPLATES.find((t) => t.code === role.code);
      if (!template) {
        throw new AppError(
          'Only predefined system roles can be reset to factory defaults',
          400,
          'NOT_A_TEMPLATE',
        );
      }

      const result = await resetRoleToTemplateDefaults(orgId, role.id);

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'role.reset_to_defaults',
        resourceType: 'role',
        resourceId: role.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { restoredPermissions: result.restoredPermissions },
      });

      res.status(200).json({
        data: {
          roleId: role.id,
          code: role.code,
          name: role.name,
          permissions: result.restoredPermissions,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/permissions',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      });
      res.status(200).json({ data: permissions, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await prisma.role.findMany({
        where: { organisationId: req.auth!.organisationId! },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          _count: {
            select: { userRoles: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ data: roles, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.manage'),
  validateRequest({ body: CreateRoleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.role.findUnique({
        where: { organisationId_code: { organisationId: orgId, code: req.body.code } },
      });
      if (existing) {
        throw new AppError('Role code already exists in this organisation', 409, 'ROLE_EXISTS');
      }

      const role = await prisma.role.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          code: req.body.code,
          description: req.body.description ?? null,
          isSystemRole: false,
        },
      });

      if (req.body.permissionCodes && req.body.permissionCodes.length > 0) {
        const perms = await prisma.permission.findMany({
          where: { code: { in: req.body.permissionCodes } },
        });
        for (const perm of perms) {
          await prisma.rolePermission.create({
            data: {
              organisationId: orgId,
              roleId: role.id,
              permissionId: perm.id,
              scopeType: 'ORGANISATION',
              effect: 'ALLOW',
            },
          });
        }
      }

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'role.created',
        resourceType: 'role',
        resourceId: role.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { role, permissionCodes: req.body.permissionCodes || [] },
      });

      res.status(201).json({ data: role, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id/permissions',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.manage'),
  validateRequest({ body: AssignPermissionsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const role = await prisma.role.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!role) throw new NotFoundError('Role not found');

      const perms = await prisma.permission.findMany({
        where: { code: { in: req.body.permissionCodes } },
      });

      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({
          where: { roleId: role.id, organisationId: orgId },
        });

        for (const perm of perms) {
          await tx.rolePermission.create({
            data: {
              organisationId: orgId,
              roleId: role.id,
              permissionId: perm.id,
              scopeType: 'ORGANISATION',
              effect: 'ALLOW',
            },
          });
        }
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'role.permissions_updated',
        resourceType: 'role',
        resourceId: role.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { permissionCodes: perms.map((p) => p.code) },
      });

      res.status(200).json({
        data: { roleId: role.id, permissions: perms.map((p) => p.code) },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

export const roleRoutes = router;
