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
