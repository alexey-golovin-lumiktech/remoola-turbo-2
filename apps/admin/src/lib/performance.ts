// Performance monitoring utilities
import { type NextWebVitalsMetric } from 'next/app';

// Web Vitals reporting
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // In production, send to analytics service
  if (process.env.NODE_ENV === `production`) {
    // Example: send to Google Analytics, Datadog, etc.
    console.log(`Web Vital:`, {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      timestamp: Date.now(),
    });

    // You could send this to your analytics service:
    // analytics.track('web_vital', {
    //   name: metric.name,
    //   value: metric.value,
    //   id: metric.id,
    // });
  }
}

// Performance measurement utilities
export class PerformanceMonitor {
  private marks = new Map<string, number>();

  start(markName: string) {
    this.marks.set(markName, performance.now());
  }

  end(markName: string): number | null {
    const startTime = this.marks.get(markName);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.marks.delete(markName);

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation: ${markName} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure<T>(markName: string, fn: () => T): T {
    this.start(markName);
    try {
      return fn();
    } finally {
      this.end(markName);
    }
  }

  async measureAsync<T>(markName: string, fn: () => Promise<T>): Promise<T> {
    this.start(markName);
    try {
      return await fn();
    } finally {
      this.end(markName);
    }
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// React hook for measuring component performance
export function usePerformanceMeasurement(componentName: string) {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    if (duration > 16.67) {
      // More than one frame at 60fps
      console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
}

// Memory usage monitoring
export function logMemoryUsage() {
  if (`memory` in performance) {
    const mem = (performance as any).memory;
    console.log(`Memory usage:`, {
      used: Math.round(mem.usedJSHeapSize / 1024 / 1024) + `MB`,
      total: Math.round(mem.totalJSHeapSize / 1024 / 1024) + `MB`,
      limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024) + `MB`,
    });
  }
}

// API performance monitoring
export function createPerformanceTrackedApiClient(apiClient: any) {
  const originalFetch = apiClient.fetch.bind(apiClient);

  apiClient.fetch = async (...args: any[]) => {
    const startTime = performance.now();
    try {
      const result = await originalFetch(...args);
      const duration = performance.now() - startTime;

      // Log slow API calls
      if (duration > 1000) {
        console.warn(`Slow API call: ${args[0]} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Failed API call: ${args[0]} took ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };

  return apiClient;
}

// Bundle size monitoring
export function logBundleSize() {
  // This would typically be done in the build process
  // For runtime monitoring, you can use:
  if (typeof window !== `undefined`) {
    const resources = performance.getEntriesByType(`resource`);
    const scripts = resources.filter((r) => r.name.endsWith(`.js`));

    scripts.forEach((script) => {
      const entry = script as any;
      if (entry.transferSize && entry.transferSize > 500000) {
        // > 500KB
        console.warn(`Large script: ${script.name} is ${(entry.transferSize / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  }
}
