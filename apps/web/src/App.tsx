import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AppRouter } from '@/app/router/AppRouter';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
