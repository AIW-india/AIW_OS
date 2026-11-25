import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      <span className="mt-3 text-sm font-medium">{label}</span>
    </div>
  );
}
