'use client';

import { Component, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

import { ThemeInitializer } from './ThemeInitializer';
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
      return (
        <div
          className={`
          flex
          min-h-[50vh]
          flex-col
          items-center
          justify-center
          gap-4
          px-6
        `}
        >
          <h2
            className={`
            text-lg
            font-semibold
            text-slate-800
            dark:text-slate-200
          `}
          >
            Something went wrong
          </h2>
          <p
            className={`
            text-center
            text-sm
            text-slate-600
            dark:text-slate-400
          `}
          >
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={
              `min-h-[44px] min-w-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white ` +
              `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
            }
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ThemeInitializer />
      <AppErrorBoundary>
        <SWRConfig value={{ ...swrConfig, fetcher: swrFetcher }}>
          <Toaster
            richColors
            position="top-center"
            toastOptions={{
              // Mobile-friendly styling
              style: {
                maxWidth: `90vw`,
              },
              // Ensure touch targets are at least 44px for accessibility
              className: `min-h-[44px]`,
            }}
            // Close on swipe for mobile UX
            closeButton
          />
          {children}
        </SWRConfig>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
