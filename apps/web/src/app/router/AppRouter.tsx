import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { OverviewPage } from '@/modules/overview/OverviewPage';
import { SystemHealthPage } from '@/modules/health/SystemHealthPage';

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
        <Route element={<AppShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/health" element={<SystemHealthPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
