import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth/better-auth.js';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../errors/app-error.js';

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  organisationId: string | null;
  organisationStatus: string | null;
  status: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData || !sessionData.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.user.id },
      include: {
        organisation: {
          select: { id: true, status: true },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User account not found', 401, 'UNAUTHENTICATED');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        `Account is ${user.status.toLowerCase()}. Access denied.`,
        403,
        'ACCOUNT_INACTIVE',
      );
    }

    const activeRoles = user.userRoles
      .map((ur) => ur.role)
      .filter((r) => r.status === 'ACTIVE' && r.organisationId === user.organisationId);

    const roleCodes = activeRoles.map((r) => r.code);

    const allowedPermissions = new Set<string>();
    const deniedPermissions = new Set<string>();

    for (const role of activeRoles) {
      for (const rp of role.rolePermissions) {
        if (rp.organisationId !== user.organisationId) continue;
        if (rp.effect === 'DENY') {
          deniedPermissions.add(rp.permission.code);
        } else if (rp.effect === 'ALLOW') {
          allowedPermissions.add(rp.permission.code);
        }
      }
    }

    const effectivePermissions = Array.from(allowedPermissions).filter(
      (p) => !deniedPermissions.has(p),
    );

    req.auth = {
      userId: user.id,
      email: user.email,
      name: user.name,
      organisationId: user.organisationId,
      organisationStatus: user.organisation?.status ?? null,
      status: user.status,
      roles: roleCodes,
      permissions: effectivePermissions,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireOrganisation(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    return;
  }

  if (!req.auth.organisationId) {
    next(new AppError('User is not associated with an active organisation', 403, 'NO_ORGANISATION'));
    return;
  }

  if (req.auth.organisationStatus !== 'ACTIVE') {
    next(new AppError('Organisation is inactive or suspended', 403, 'ORGANISATION_INACTIVE'));
    return;
  }

  // Reject cross-tenant access if caller supplies a mismatched organisationId header or param
  const headerOrgId = req.header('x-organisation-id');
  const paramOrgId = req.params.organisationId;

  if (headerOrgId && headerOrgId !== req.auth.organisationId) {
    next(new AppError('Cross-tenant access denied', 403, 'CROSS_TENANT_FORBIDDEN'));
    return;
  }

  if (paramOrgId && paramOrgId !== req.auth.organisationId) {
    next(new AppError('Cross-tenant access denied', 403, 'CROSS_TENANT_FORBIDDEN'));
    return;
  }

  next();
}

export function requirePermission(permissionCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
      return;
    }

    if (!req.auth.permissions.includes(permissionCode)) {
      next(
        new AppError(
          `Missing required permission: ${permissionCode}`,
          403,
          'FORBIDDEN',
        ),
      );
      return;
    }

    next();
  };
}
