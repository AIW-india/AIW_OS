import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { AppRouter } from '@/app/router/AppRouter';

export function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;
