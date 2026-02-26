// Performance monitoring utilities
import { type NextWebVitalsMetric } from 'next/app';

import { clientLogger } from './logger';

// Web Vitals reporting (dev only via logger; in production wire to analytics.track etc.)
export function reportWebVitals(metric: NextWebVitalsMetric) {
  clientLogger.info(`Web Vital`, {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    timestamp: Date.now(),
  });
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Memory usage monitoring (dev only via logger)
export function logMemoryUsage() {
  const perf = performance as Performance & { memory?: PerformanceMemory };
  if (perf.memory) {
    const mem = perf.memory;
    clientLogger.info(`Memory usage`, {
      used: Math.round(mem.usedJSHeapSize / 1024 / 1024) + `MB`,
      total: Math.round(mem.totalJSHeapSize / 1024 / 1024) + `MB`,
      limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024) + `MB`,
    });
  }
}

// API performance monitoring
interface ApiClientWithFetch {
  fetch: (path: string, options?: RequestInit, cacheConfig?: { ttl?: number; skipCache?: boolean }) => Promise<unknown>;
}

export function createPerformanceTrackedApiClient(apiClient: ApiClientWithFetch) {
  const originalFetch = apiClient.fetch.bind(apiClient);

  apiClient.fetch = async (...args: Parameters<ApiClientWithFetch[`fetch`]>) => {
    const startTime = performance.now();
    try {
      const result = await originalFetch(...args);
      const duration = performance.now() - startTime;

      if (duration > 1000) {
        clientLogger.warn(`Slow API call`, { path: args[0], durationMs: duration.toFixed(2) });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      clientLogger.error(`Failed API call`, {
        path: args[0],
        durationMs: duration.toFixed(2),
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  return apiClient;
}
