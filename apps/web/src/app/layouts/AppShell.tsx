import { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Building2,
  ClipboardList,
  FolderTree,
  Home,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  Users,
  X,
  KanbanSquare,
  UserCheck,
  PhoneCall,
  MapPin,
  PieChart,
  Calculator,
  FileSpreadsheet,
  FileText,
  Boxes,
  Hammer,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

export interface NavigationItem {
  name: string;
  to: string;
  icon: typeof Home;
  permission?: string;
  anyPermissions?: string[];
}

export const navigationItems: NavigationItem[] = [
  { name: 'Overview', to: '/', icon: Home },
  {
    name: 'CRM Overview',
    to: '/crm',
    icon: PieChart,
    anyPermissions: ['crm.leads.view', 'crm.reports.view'],
  },
  { name: 'Leads', to: '/crm/leads', icon: Users, permission: 'crm.leads.view' },
  { name: 'Pipeline Kanban', to: '/crm/pipeline', icon: KanbanSquare, permission: 'crm.leads.view' },
  { name: 'Customers', to: '/crm/customers', icon: UserCheck, permission: 'crm.customers.view' },
  { name: 'Follow-ups', to: '/crm/follow-ups', icon: PhoneCall, permission: 'crm.followups.manage' },
  { name: 'Site Visits', to: '/crm/site-visits', icon: MapPin, permission: 'crm.site_visits.manage' },
  {
    name: 'Estimation Hub',
    to: '/estimation',
    icon: Calculator,
    anyPermissions: ['estimation.estimates.view', 'estimation.quotations.view', 'estimation.rates.view'],
  },
  { name: 'Estimates & BOQ', to: '/estimation/estimates', icon: FileSpreadsheet, permission: 'estimation.estimates.view' },
  { name: 'Quotations', to: '/estimation/quotations', icon: FileText, permission: 'estimation.quotations.view' },
  { name: 'Material Library', to: '/estimation/materials', icon: Boxes, permission: 'estimation.rates.view' },
  { name: 'Labour Rates', to: '/estimation/labour', icon: Hammer, permission: 'estimation.rates.view' },
  {
    name: 'Projects Dashboard',
    to: '/projects',
    icon: PieChart,
    permission: 'projects.view',
  },
  {
    name: 'Projects & Execution',
    to: '/projects/list',
    icon: Briefcase,
    permission: 'projects.view',
  },
  {
    name: 'Milestone Templates',
    to: '/projects/templates',
    icon: Calendar,
    permission: 'projects.milestones.manage',
  },
  { name: 'Users', to: '/users', icon: Users, permission: 'users.view' },
  { name: 'Departments', to: '/departments', icon: FolderTree, permission: 'departments.view' },
  { name: 'Designations', to: '/designations', icon: Award, permission: 'designations.view' },
  { name: 'Roles & Permissions', to: '/roles', icon: Shield, permission: 'roles.view' },
  { name: 'Organisation', to: '/organisation', icon: Building2, permission: 'organisation.view' },
  { name: 'Audit Logs', to: '/audit-logs', icon: ClipboardList, permission: 'audit.view' },
  { name: 'System Health', to: '/health', icon: Activity },
];

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, organisation, signOut, hasPermission, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Filter navigation items based on the user's active permissions
  const visibleNavItems = useMemo(() => {
    if (loading || !user) return [];

    return navigationItems.filter((item) => {
      // Items with no permission specified are public to all authenticated users
      if (!item.permission && (!item.anyPermissions || item.anyPermissions.length === 0)) {
        return true;
      }
      if (item.permission && hasPermission(item.permission)) {
        return true;
      }
      if (item.anyPermissions && item.anyPermissions.some((p) => hasPermission(p))) {
        return true;
      }
      return false;
    });
  }, [loading, user, hasPermission]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900">AIW OS</span>
              <span className="block text-[11px] font-medium text-slate-500">
                {organisation?.name || 'Enterprise Platform'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-2">
          <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="truncate">{user?.email || 'Not signed in'}</span>
          </div>
          {user && (
            <button
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-slate-600">
              AIW Operations System
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {organisation?.name || 'Enterprise'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
