import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { OverviewPage } from '@/modules/overview/OverviewPage';
import { SystemHealthPage } from '@/modules/health/SystemHealthPage';
import { LoginPage } from '@/modules/auth/LoginPage';
import { OrganisationPage } from '@/modules/organisation/OrganisationPage';
import { UsersPage } from '@/modules/users/UsersPage';
import { DepartmentsPage } from '@/modules/departments/DepartmentsPage';
import { DesignationsPage } from '@/modules/designations/DesignationsPage';
import { RolesPage } from '@/modules/roles/RolesPage';
import { AuditLogsPage } from '@/modules/audit/AuditLogsPage';
import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner label="Verifying session..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-sm text-slate-500">The requested page could not be found.</p>
      <Link
        to="/"
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Return to Overview
      </Link>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route path="/health" element={<SystemHealthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute>
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/designations"
            element={
              <ProtectedRoute>
                <DesignationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute>
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organisation"
            element={
              <ProtectedRoute>
                <OrganisationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
