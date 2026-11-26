import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Hook to check if the authenticated user has a specific permission.
 */
export function usePermission(permissionCode?: string): boolean {
  const { hasPermission, loading, user } = useAuth();
  if (loading || !user || !permissionCode) return false;
  return hasPermission(permissionCode);
}

/**
 * Hook to check if the authenticated user has ANY of the specified permissions.
 */
export function useAnyPermission(permissionCodes: string[]): boolean {
  const { hasPermission, loading, user } = useAuth();
  if (loading || !user || !permissionCodes.length) return false;
  return permissionCodes.some((code) => hasPermission(code));
}

/**
 * Hook to check if the authenticated user has ALL of the specified permissions.
 */
export function useAllPermissions(permissionCodes: string[]): boolean {
  const { hasPermission, loading, user } = useAuth();
  if (loading || !user || !permissionCodes.length) return false;
  return permissionCodes.every((code) => hasPermission(code));
}

export interface PermissionGateProps {
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component-level permission gate.
 * Renders `children` only if the user has the required permission(s); otherwise renders `fallback` (or null).
 */
export function PermissionGate({
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, loading, user } = useAuth();

  if (loading || !user) return null;

  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (hasAccess && anyPermissions && anyPermissions.length > 0) {
    hasAccess = anyPermissions.some((code) => hasPermission(code));
  }

  if (hasAccess && allPermissions && allPermissions.length > 0) {
    hasAccess = allPermissions.every((code) => hasPermission(code));
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
