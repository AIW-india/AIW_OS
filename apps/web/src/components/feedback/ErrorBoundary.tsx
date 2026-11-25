import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              An unexpected error occurred in the application. Please try reloading.
            </p>
            {this.state.error && (
              <pre className="mt-4 overflow-auto rounded bg-slate-100 p-3 text-xs text-slate-700">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
