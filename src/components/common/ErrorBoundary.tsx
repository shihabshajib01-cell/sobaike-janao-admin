import { Button } from '@/components/ui/Button';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Admin ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isBn =
        typeof document !== 'undefined' && document.documentElement.lang === 'bn';

      return (
        <div
          role="alert"
          className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 rounded-lg m-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {isBn ? 'কিছু সমস্যা হয়েছে' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-4">
            {isBn
              ? 'এই অংশটি লোড করার সময় একটি অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করুন।'
              : 'An unexpected problem occurred while loading this section. Please try again.'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={this.handleReset}
            leftIcon={<RefreshCw />}
          >
            {isBn ? 'আবার চেষ্টা করুন' : 'Try again'}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
