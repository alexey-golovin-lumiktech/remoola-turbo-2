'use client';

import { Component, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

import { ErrorState } from './ErrorState';
import { ThemeColorMeta } from './ThemeColorMeta';
import { ThemeProvider } from './ThemeProvider';
import { swrConfig, swrFetcher } from '../../lib/client';

interface AppProvidersProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ThemeColorMeta />
      <AppErrorBoundary>
        <SWRConfig value={{ ...swrConfig, fetcher: swrFetcher }}>
          <Toaster
            richColors
            position="top-center"
            toastOptions={{
              duration: 6000,
              style: {
                maxWidth: `90vw`,
              },
              className: `min-h-11`,
            }}
            closeButton
          />
          {children}
        </SWRConfig>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
