'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useUrlFilters<T extends Record<string, string | string[] | undefined>>() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const getFilters = useCallback((): T => {
    const filters: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      const existing = filters[key];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          filters[key] = [existing, value];
        }
      } else {
        filters[key] = value;
      }
    });
    return filters as T;
  }, [searchParams]);

  const setFilters = useCallback(
    (newFilters: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === ``) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.delete(key);
          value.forEach((v) => params.append(key, String(v)));
        } else {
          params.set(key, String(value));
        }
      });

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters = useCallback((): boolean => {
    return Array.from(searchParams.keys()).length > 0;
  }, [searchParams]);

  return {
    filters: getFilters(),
    setFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
  };
}

export function parseUrlSearchParams<T extends Record<string, unknown>>(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  schema?: {
    [K in keyof T]?: (value: string) => T[K];
  },
): Partial<T> {
  const result: Record<string, unknown> = {};

  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => {
      const parser = schema?.[key as keyof T];
      result[key] = parser ? parser(value) : value;
    });
  } else {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        const parser = schema?.[key as keyof T];
        const stringValue = Array.isArray(value) ? value[0] : value;
        result[key] = parser && stringValue ? parser(stringValue) : value;
      }
    });
  }

  return result as Partial<T>;
}

export function buildUrlWithFilters(
  basePath: string,
  filters: Record<string, string | number | boolean | undefined | null>,
): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== ``) {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
