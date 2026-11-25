import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { auth } from '../../common/auth/better-auth.js';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { provisionOrganisationSuperAdminRole } from '../../common/rbac/permissions-catalog.js';
import { recordAuditEvent } from '../../common/audit/audit.service.js';
import { AppError } from '../../common/errors/app-error.js';

const router = Router();

const BootstrapSchema = z.object({
  organisationName: z.string().min(2).max(120),
  organisationSlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
});

/**
 * GET /api/v1/auth/me
 * Returns current authenticated user, organisation context, roles, and permissions.
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organisation = req.auth?.organisationId
      ? await prisma.organisation.findUnique({
          where: { id: req.auth.organisationId },
        })
      : null;

    res.status(200).json({
      data: {
        user: {
          id: req.auth!.userId,
          email: req.auth!.email,
          name: req.auth!.name,
          status: req.auth!.status,
          organisationId: req.auth!.organisationId,
        },
        organisation,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/bootstrap
 * Creates an organisation and its initial Organisation Super Admin account.
 */
router.post(
  '/bootstrap',
  validateRequest({ body: BootstrapSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organisationName, organisationSlug, adminName, adminEmail, adminPassword } = req.body;

      // 1. Prevent repeat bootstrap once any organisation exists
      const orgCount = await prisma.organisation.count();
      if (orgCount > 0) {
        throw new AppError(
          'Initial organisation setup has already been completed',
          403,
          'BOOTSTRAP_DISABLED',
        );
      }

      // 2. Acquire atomic bootstrap lock to prevent concurrent race conditions
      try {
        await prisma.systemMetadata.create({
          data: {
            key: 'bootstrap_lock',
            value: new Date().toISOString(),
          },
        });
      } catch {
        throw new AppError(
          'Bootstrap is already in progress or completed',
          409,
          'BOOTSTRAP_CONFLICT',
        );
      }

      const existingOrg = await prisma.organisation.findUnique({
        where: { slug: organisationSlug },
      });
      if (existingOrg) {
        throw new AppError('Organisation slug already exists', 409, 'ORGANISATION_EXISTS');
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      if (existingUser) {
        throw new AppError('User email already exists', 409, 'USER_EXISTS');
      }

      // 1. Create user via Better Auth (handles secure password hashing)
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: adminName,
        },
      });

      if (!signUpResult || !signUpResult.user) {
        throw new AppError('Failed to create admin user', 500, 'USER_CREATION_FAILED');
      }

      // 2. Create Organisation
      const organisation = await prisma.organisation.create({
        data: {
          name: organisationName,
          slug: organisationSlug,
          status: 'ACTIVE',
        },
      });

      // 3. Provision ORGANISATION_SUPER_ADMIN role
      const superAdminRole = await provisionOrganisationSuperAdminRole(organisation.id);

      // 4. Link user to organisation and assign Super Admin role
      await prisma.user.update({
        where: { id: signUpResult.user.id },
        data: {
          organisationId: organisation.id,
          status: 'ACTIVE',
        },
      });

      await prisma.userRole.create({
        data: {
          organisationId: organisation.id,
          userId: signUpResult.user.id,
          roleId: superAdminRole.id,
          assignedByUserId: signUpResult.user.id,
        },
      });

      await recordAuditEvent({
        organisationId: organisation.id,
        actorUserId: signUpResult.user.id,
        action: 'organisation.bootstrapped',
        resourceType: 'organisation',
        resourceId: organisation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: {
          organisationName: organisation.name,
          organisationSlug: organisation.slug,
          adminEmail,
        },
      });

      res.status(201).json({
        data: {
          organisation,
          user: {
            id: signUpResult.user.id,
            email: signUpResult.user.email,
            name: signUpResult.user.name,
          },
          role: superAdminRole.code,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

const AcceptInvitationSchema = z.object({
  token: z.string().min(16),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
});

/**
 * POST /api/v1/auth/accept-invitation
 * Validates single-use invitation token, creates user, assigns org/role, and invalidates token.
 */
router.post(
  '/accept-invitation',
  validateRequest({ body: AcceptInvitationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, name, password } = req.body;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const invitation = await prisma.invitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation || invitation.status !== 'PENDING') {
        throw new AppError('Invalid or already used invitation token', 400, 'INVALID_INVITATION');
      }

      if (invitation.expiresAt < new Date()) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
        throw new AppError('Invitation token has expired', 400, 'INVITATION_EXPIRED');
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
      });
      if (existingUser) {
        throw new AppError('User email already registered', 409, 'USER_EXISTS');
      }

      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: invitation.email,
          password,
          name,
        },
      });

      if (!signUpResult || !signUpResult.user) {
        throw new AppError('Failed to create user account', 500, 'USER_CREATION_FAILED');
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: signUpResult.user.id },
          data: {
            organisationId: invitation.organisationId,
            departmentId: invitation.departmentId,
            designationId: invitation.designationId,
            status: 'ACTIVE',
          },
        });

        if (invitation.roleId) {
          await tx.userRole.create({
            data: {
              organisationId: invitation.organisationId,
              userId: signUpResult.user.id,
              roleId: invitation.roleId,
              assignedByUserId: invitation.invitedByUserId,
            },
          });
        }

        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        });
      });

      await recordAuditEvent({
        organisationId: invitation.organisationId,
        actorUserId: signUpResult.user.id,
        action: 'user.invitation_accepted',
        resourceType: 'invitation',
        resourceId: invitation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { email: invitation.email, status: 'ACCEPTED' },
      });

      res.status(201).json({
        data: {
          user: {
            id: signUpResult.user.id,
            email: signUpResult.user.email,
            name: signUpResult.user.name,
            organisationId: invitation.organisationId,
          },
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

export const authCustomRoutes = router;
