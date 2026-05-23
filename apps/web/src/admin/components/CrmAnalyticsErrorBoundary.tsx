import { Component, type ErrorInfo, type ReactNode } from 'react';
import CrmInlineError from '@/admin/components/CrmInlineError';
import { crmObsAnalyticsBoundaryError } from '@/admin/lib/crm-observability';

type Props = { children: ReactNode; onRetry?: () => void };

type State = { error: Error | null };

/**
 * Isolates heavy analytics render failures from operational CRM UI (Iter 43).
 */
export default class CrmAnalyticsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    crmObsAnalyticsBoundaryError(error.message, info.componentStack?.slice(0, 120) ?? '');
  }

  render() {
    if (this.state.error) {
      return (
        <CrmInlineError
          message="Аналитика временно недоступна — операционный CRM работает"
          onRetry={
            this.props.onRetry ??
            (() => {
              this.setState({ error: null });
            })
          }
          className="mb-4"
        />
      );
    }
    return this.props.children;
  }
}
