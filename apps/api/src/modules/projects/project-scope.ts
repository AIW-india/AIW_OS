import { prisma } from '../../database/prisma.js';

export interface ProjectScopeCheckResult {
  hasAccess: boolean;
  projectExists: boolean;
  isOwnerOrSuperAdmin: boolean;
  isProjectManager: boolean;
  isMember: boolean;
  projectRole?: string;
}

/**
 * Checks if a user has access to a specific project within an organisation.
 * Access is granted if:
 * 1. User has 'projects.view_all' permission
 * 2. User is the assigned project manager
 * 3. User is an active member in project_memberships
 */
export async function checkProjectAccess(
  organisationId: string,
  projectId: string,
  userId: string,
  userPermissions: string[],
): Promise<ProjectScopeCheckResult> {
  const isSuperAdminOrHasViewAll =
    userPermissions.includes('projects.view_all') ||
    userPermissions.includes('organisation.manage');

  const project = await prisma.project.findFirst({
    where: { id: projectId, organisationId },
    select: { id: true, projectManagerId: true },
  });

  if (!project) {
    return {
      hasAccess: false,
      projectExists: false,
      isOwnerOrSuperAdmin: isSuperAdminOrHasViewAll,
      isProjectManager: false,
      isMember: false,
    };
  }

  const isProjectManager = project.projectManagerId === userId;

  const membership = await prisma.projectMembership.findFirst({
    where: {
      organisationId,
      projectId,
      userId,
      status: 'ACTIVE',
    },
    select: { projectRole: true },
  });

  const isMember = Boolean(membership);
  const hasAccess = isSuperAdminOrHasViewAll || isProjectManager || isMember;

  return {
    hasAccess,
    projectExists: true,
    isOwnerOrSuperAdmin: isSuperAdminOrHasViewAll,
    isProjectManager,
    isMember,
    projectRole: membership?.projectRole,
  };
}
