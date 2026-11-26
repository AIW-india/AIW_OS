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
import { CrmOverviewPage } from '@/modules/crm/CrmOverviewPage';
import { LeadsListPage } from '@/modules/crm/LeadsListPage';
import { CreateLeadPage } from '@/modules/crm/CreateLeadPage';
import { LeadDetailsPage } from '@/modules/crm/LeadDetailsPage';
import { PipelineKanbanPage } from '@/modules/crm/PipelineKanbanPage';
import { CustomersListPage } from '@/modules/crm/CustomersListPage';
import { CustomerDetailsPage } from '@/modules/crm/CustomerDetailsPage';
import { FollowUpsPage } from '@/modules/crm/FollowUpsPage';
import { SiteVisitsPage } from '@/modules/crm/SiteVisitsPage';
import { LostLeadsPage } from '@/modules/crm/LostLeadsPage';
import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { AccessDeniedPage } from '@/components/feedback/AccessDeniedPage';

interface ProtectedRouteProps {
  children: JSX.Element;
  permission?: string;
  anyPermissions?: string[];
  moduleName?: string;
}

export function ProtectedRoute({
  children,
  permission,
  anyPermissions,
  moduleName,
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <LoadingSpinner label="Verifying session and permissions..." />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.status !== 'ACTIVE') {
    return <AccessDeniedPage moduleName="Active Account" requiredPermission="Account is deactivated" />;
  }

  if (permission && !hasPermission(permission)) {
    return <AccessDeniedPage requiredPermission={permission} moduleName={moduleName} />;
  }

  if (anyPermissions && anyPermissions.length > 0) {
    const hasAny = anyPermissions.some((p) => hasPermission(p));
    if (!hasAny) {
      return (
        <AccessDeniedPage
          requiredPermission={anyPermissions.join(' or ')}
          moduleName={moduleName}
        />
      );
    }
  }

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
              <ProtectedRoute permission="users.view" moduleName="Users">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute permission="departments.view" moduleName="Departments">
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/designations"
            element={
              <ProtectedRoute permission="designations.view" moduleName="Designations">
                <DesignationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute permission="roles.view" moduleName="Roles & Permissions">
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organisation"
            element={
              <ProtectedRoute permission="organisation.view" moduleName="Organisation">
                <OrganisationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute permission="audit.view" moduleName="Audit Logs">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* CRM Module Routes */}
          <Route
            path="/crm"
            element={
              <ProtectedRoute
                anyPermissions={['crm.leads.view', 'crm.reports.view']}
                moduleName="CRM Overview"
              >
                <CrmOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/leads"
            element={
              <ProtectedRoute permission="crm.leads.view" moduleName="Leads">
                <LeadsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/leads/create"
            element={
              <ProtectedRoute permission="crm.leads.create" moduleName="Create Lead">
                <CreateLeadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/leads/:id"
            element={
              <ProtectedRoute permission="crm.leads.view" moduleName="Lead Details">
                <LeadDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/pipeline"
            element={
              <ProtectedRoute permission="crm.leads.view" moduleName="Pipeline Kanban">
                <PipelineKanbanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/customers"
            element={
              <ProtectedRoute permission="crm.customers.view" moduleName="Customers">
                <CustomersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/customers/:id"
            element={
              <ProtectedRoute permission="crm.customers.view" moduleName="Customer Details">
                <CustomerDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/follow-ups"
            element={
              <ProtectedRoute permission="crm.followups.manage" moduleName="Follow-ups">
                <FollowUpsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/site-visits"
            element={
              <ProtectedRoute permission="crm.site_visits.manage" moduleName="Site Visits">
                <SiteVisitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm/lost-leads"
            element={
              <ProtectedRoute permission="crm.leads.view" moduleName="Lost Leads Report">
                <LostLeadsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
