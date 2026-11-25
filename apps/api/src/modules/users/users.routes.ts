import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { auth } from '../../common/auth/better-auth.js';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { recordAuditEvent } from '../../common/audit/audit.service.js';
import { emailProvider } from '../../integrations/email/email.provider.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';

const router = Router();

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().max(30).optional(),
  employeeCode: z.string().max(30).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  designationId: z.string().uuid().nullable().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

const InviteUserSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  employeeCode: z.string().max(30).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  designationId: z.string().uuid().nullable().optional(),
});

const AssignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

const AssignProjectsSchema = z.object({
  projects: z.array(
    z.object({
      projectId: z.string().uuid(),
      projectRole: z.string().min(2).max(50),
    }),
  ),
});

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('users.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        where: { organisationId: req.auth!.organisationId! },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          employeeCode: true,
          status: true,
          departmentId: true,
          designationId: true,
          department: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, name: true, code: true } },
          userRoles: {
            include: {
              role: { select: { id: true, name: true, code: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ data: users, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('users.create'),
  validateRequest({ body: CreateUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { name, email, password, phone, employeeCode, departmentId, designationId, roleIds } =
        req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('Email already registered', 409, 'USER_EXISTS');
      }

      const signUpResult = await auth.api.signUpEmail({
        body: { email, password, name },
      });

      if (!signUpResult || !signUpResult.user) {
        throw new AppError('Failed to create user', 500, 'USER_CREATION_FAILED');
      }

      const updatedUser = await prisma.user.update({
        where: { id: signUpResult.user.id },
        data: {
          organisationId: orgId,
          phone: phone ?? null,
          employeeCode: employeeCode ?? null,
          departmentId: departmentId ?? null,
          designationId: designationId ?? null,
          status: 'ACTIVE',
        },
      });

      if (roleIds && roleIds.length > 0) {
        const validRoles = await prisma.role.findMany({
          where: { id: { in: roleIds }, organisationId: orgId },
        });
        for (const role of validRoles) {
          await prisma.userRole.create({
            data: {
              organisationId: orgId,
              userId: updatedUser.id,
              roleId: role.id,
              assignedByUserId: req.auth!.userId,
            },
          });
        }
      }

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.created',
        resourceType: 'user',
        resourceId: updatedUser.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { email: updatedUser.email, name: updatedUser.name, status: updatedUser.status },
      });

      res.status(201).json({
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          status: updatedUser.status,
          organisationId: updatedUser.organisationId,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/invite',
  requireAuth,
  requireOrganisation,
  requirePermission('users.create'),
  validateRequest({ body: InviteUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const invitation = await prisma.invitation.create({
        data: {
          organisationId: orgId,
          email: req.body.email,
          invitedByUserId: req.auth!.userId,
          roleId: req.body.roleId ?? null,
          departmentId: req.body.departmentId ?? null,
          designationId: req.body.designationId ?? null,
          tokenHash,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
          status: 'PENDING',
        },
      });

      await emailProvider.sendEmail({
        to: invitation.email,
        subject: 'You have been invited to AIW OS',
        text: `You have been invited to join AIW OS. Use your invitation token to complete setup: ${rawToken}`,
      });

      await emailProvider.sendEmail({
        to: invitation.email,
        subject: 'You have been invited to AIW OS',
        text: `You have been invited to join AIW OS. Use your invitation token to complete setup: ${rawToken}`,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.invited',
        resourceType: 'invitation',
        resourceId: invitation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { email: invitation.email, status: invitation.status },
      });

      res.status(201).json({
        data: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('users.update'),
  validateRequest({ body: UpdateUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.user.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('User not found');

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: req.body,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          employeeCode: true,
          departmentId: true,
          designationId: true,
          status: true,
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.updated',
        resourceType: 'user',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: updated,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/deactivate',
  requireAuth,
  requireOrganisation,
  requirePermission('users.deactivate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      if (req.params.id === req.auth!.userId) {
        throw new AppError('Cannot deactivate your own account', 400, 'SELF_DEACTIVATION_DENIED');
      }

      const existing = await prisma.user.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('User not found');

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: { status: 'DEACTIVATED' },
        });
        await tx.session.deleteMany({
          where: { userId: existing.id },
        });
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.deactivated',
        resourceType: 'user',
        resourceId: existing.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: { status: existing.status },
        afterJson: { status: 'DEACTIVATED' },
      });

      res.status(200).json({
        data: { id: existing.id, status: 'DEACTIVATED' },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/reactivate',
  requireAuth,
  requireOrganisation,
  requirePermission('users.deactivate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.user.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('User not found');

      await prisma.user.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.reactivated',
        resourceType: 'user',
        resourceId: existing.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: { status: existing.status },
        afterJson: { status: 'ACTIVE' },
      });

      res.status(200).json({
        data: { id: existing.id, status: 'ACTIVE' },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id/roles',
  requireAuth,
  requireOrganisation,
  requirePermission('roles.manage'),
  validateRequest({ body: AssignRolesSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      if (req.params.id === req.auth!.userId) {
        throw new AppError('Cannot modify your own roles', 403, 'SELF_ROLE_MODIFICATION_DENIED');
      }
      const targetUser = await prisma.user.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!targetUser) throw new NotFoundError('User not found');

      const validRoles = await prisma.role.findMany({
        where: { id: { in: req.body.roleIds }, organisationId: orgId },
      });

      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({
          where: { userId: targetUser.id, organisationId: orgId },
        });
        for (const role of validRoles) {
          await tx.userRole.create({
            data: {
              organisationId: orgId,
              userId: targetUser.id,
              roleId: role.id,
              assignedByUserId: req.auth!.userId,
            },
          });
        }
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.roles_updated',
        resourceType: 'user',
        resourceId: targetUser.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { roleCodes: validRoles.map((r) => r.code) },
      });

      res.status(200).json({
        data: { userId: targetUser.id, roles: validRoles.map((r) => r.code) },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id/projects',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.membership.manage'),
  validateRequest({ body: AssignProjectsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      if (req.params.id === req.auth!.userId) {
        throw new AppError('Cannot modify your own roles', 403, 'SELF_ROLE_MODIFICATION_DENIED');
      }
      const targetUser = await prisma.user.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!targetUser) throw new NotFoundError('User not found');

      await prisma.$transaction(async (tx) => {
        await tx.projectMembership.deleteMany({
          where: { userId: targetUser.id, organisationId: orgId },
        });
        for (const proj of req.body.projects) {
          await tx.projectMembership.create({
            data: {
              organisationId: orgId,
              userId: targetUser.id,
              projectId: proj.projectId,
              projectRole: proj.projectRole,
              status: 'ACTIVE',
            },
          });
        }
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'user.projects_updated',
        resourceType: 'user',
        resourceId: targetUser.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { projects: req.body.projects },
      });

      res.status(200).json({
        data: { userId: targetUser.id, projects: req.body.projects },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

export const userRoutes = router;
