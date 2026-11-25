import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: string;
  organisationId: string | null;
}

export interface AuthOrganisation {
  id: string;
  name: string;
  legalName: string | null;
  slug: string;
  status: string;
  timezone: string;
  defaultCurrency: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  organisation: AuthOrganisation | null;
  roles: string[];
  permissions: string[];
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organisation, setOrganisation] = useState<AuthOrganisation | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const res = await apiClient.get<{
        user: AuthUser;
        organisation: AuthOrganisation | null;
        roles: string[];
        permissions: string[];
      }>('/auth/me');
      setUser(res.data.user);
      setOrganisation(res.data.organisation);
      setRoles(res.data.roles);
      setPermissions(res.data.permissions);
    } catch {
      setUser(null);
      setOrganisation(null);
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await apiClient.post('/auth/sign-out', {});
    } finally {
      setUser(null);
      setOrganisation(null);
      setRoles([]);
      setPermissions([]);
    }
  };

  const hasPermission = (code: string) => permissions.includes(code);

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organisation,
        roles,
        permissions,
        loading,
        refreshSession,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
