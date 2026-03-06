import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import { swrFetcher, fetchWithAuth, swrConfig } from './client';

describe(`Token Refresh - swrFetcher`, () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;
  const originalWindow = global.window;

  beforeEach(() => {
    global.fetch = mockFetch as any;
    // @ts-expect-error - mocking window
    global.window = {
      location: {
        pathname: `/dashboard`,
        href: ``,
      },
    };
    mockFetch.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.window = originalWindow;
  });

  describe(`Successful API call`, () => {
    it(`should return data when API returns 200`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, name: `Test` }),
      });

      const result = await swrFetcher(`/api/profile`);

      expect(result).toEqual({ id: 1, name: `Test` });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`/api/profile`, {
        credentials: `include`,
        cache: `no-store`,
      });
    });
  });

  describe(`401 Unauthorized - Token Refresh`, () => {
    it(`should refresh token and retry on 401`, async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => `Unauthorized`,
      });

      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: `new-token` }),
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, name: `Test` }),
      });

      const result = await swrFetcher(`/api/profile`);

      expect(result).toEqual({ id: 1, name: `Test` });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Check refresh was called
      expect(mockFetch).toHaveBeenNthCalledWith(2, `/api/consumer/auth/refresh`, {
        method: `POST`,
        credentials: `include`,
        cache: `no-store`,
      });

      // Check retry was called
      expect(mockFetch).toHaveBeenNthCalledWith(3, `/api/profile`, {
        credentials: `include`,
        cache: `no-store`,
      });
    });

    it(`should redirect to login when refresh fails`, async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => `Unauthorized`,
      });

      // Refresh call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: `Refresh token expired` }),
      });

      await expect(swrFetcher(`/api/profile`)).rejects.toThrow(`Session expired`);

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(`/login?session_expired=true&next=%2Fdashboard`);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it(`should redirect to login when refresh throws error`, async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => `Unauthorized`,
      });

      // Refresh call throws network error
      mockFetch.mockRejectedValueOnce(new Error(`Network error`));

      await expect(swrFetcher(`/api/profile`)).rejects.toThrow(`Session expired`);

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(`/login?session_expired=true&next=%2Fdashboard`);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe(`Other error responses`, () => {
    it(`should throw error for 500 server error`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: `Internal server error` }),
      });

      await expect(swrFetcher(`/api/profile`)).rejects.toThrow(`Internal server error`);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it(`should throw error for 404 not found`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => `Not found`,
      });

      await expect(swrFetcher(`/api/profile`)).rejects.toThrow(`Not found`);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe(`Query key to URL conversion`, () => {
    it(`should handle string keys`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: `test` }),
      });

      await swrFetcher(`/api/profile`);

      expect(mockFetch).toHaveBeenCalledWith(`/api/profile`, expect.any(Object));
    });

    it(`should handle array keys with params`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: `test` }),
      });

      await swrFetcher([`/api/contacts`, { page: 1, limit: 10 }]);

      expect(mockFetch).toHaveBeenCalledWith(`/api/contacts?page=1&limit=10`, expect.any(Object));
    });

    it(`should handle array keys without params`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: `test` }),
      });

      await swrFetcher([`/api/profile`]);

      expect(mockFetch).toHaveBeenCalledWith(`/api/profile`, expect.any(Object));
    });
  });
});

describe(`Token Refresh - fetchWithAuth`, () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;
  const originalWindow = global.window;

  beforeEach(() => {
    global.fetch = mockFetch as any;
    // @ts-expect-error - mocking window
    global.window = {
      location: {
        pathname: `/settings`,
        href: ``,
      },
    };
    mockFetch.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.window = originalWindow;
  });

  describe(`Successful API call`, () => {
    it(`should return success result when API returns 200`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await fetchWithAuth(`/api/settings`, {
        method: `POST`,
        body: JSON.stringify({ theme: `dark` }),
      });

      expect(result).toEqual({
        ok: true,
        data: { success: true },
        status: 200,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it(`should handle non-JSON responses`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error(`Not JSON`);
        },
      });

      const result = await fetchWithAuth(`/api/logout`, { method: `POST` });

      expect(result).toEqual({
        ok: true,
        data: {},
        status: 204,
      });
    });
  });

  describe(`401 Unauthorized - Token Refresh`, () => {
    it(`should refresh token and retry on 401`, async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => `Unauthorized`,
      });

      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: `new-token` }),
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

      expect(result).toEqual({
        ok: true,
        data: { success: true },
        status: 200,
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it(`should return error when refresh fails`, async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => `Unauthorized`,
      });

      // Refresh call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: `Refresh token expired` }),
      });

      const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

      expect(result).toEqual({
        ok: false,
        error: `Session expired`,
        status: 401,
      });

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(`/login?session_expired=true&next=%2Fsettings`);
    });

    it(`should handle refresh network error`, async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => `Unauthorized`,
      });

      // Refresh throws error
      mockFetch.mockRejectedValueOnce(new Error(`Network error`));

      const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

      expect(result).toEqual({
        ok: false,
        error: `Session expired`,
        status: 401,
      });

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(`/login?session_expired=true&next=%2Fsettings`);
    });
  });

  describe(`Other error responses`, () => {
    it(`should return error for 400 bad request`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: `Invalid data` }),
      });

      const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

      expect(result).toEqual({
        ok: false,
        error: `Invalid data`,
        status: 400,
      });
    });

    it(`should return error for 500 server error`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => `Internal server error`,
      });

      const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

      expect(result).toEqual({
        ok: false,
        error: `Internal server error`,
        status: 500,
      });
    });
  });

  describe(`Request options`, () => {
    it(`should merge custom options with defaults`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await fetchWithAuth(`/api/settings`, {
        method: `PUT`,
        headers: { 'custom-header': `value` },
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/settings`, {
        method: `PUT`,
        headers: { 'custom-header': `value` },
        credentials: `include`,
        cache: `no-store`,
      });
    });
  });
});

describe(`SWR Config`, () => {
  describe(`shouldRetryOnError`, () => {
    it(`should not retry 401 errors`, () => {
      const error = { status: 401 };
      const shouldRetry = swrConfig.shouldRetryOnError?.(error);
      expect(shouldRetry).toBe(false);
    });

    it(`should not retry 404 errors`, () => {
      const error = { status: 404 };
      const shouldRetry = swrConfig.shouldRetryOnError?.(error);
      expect(shouldRetry).toBe(false);
    });

    it(`should retry 500 errors`, () => {
      const error = { status: 500 };
      const shouldRetry = swrConfig.shouldRetryOnError?.(error);
      expect(shouldRetry).toBe(true);
    });

    it(`should retry 503 errors`, () => {
      const error = { status: 503 };
      const shouldRetry = swrConfig.shouldRetryOnError?.(error);
      expect(shouldRetry).toBe(true);
    });

    it(`should not retry without status`, () => {
      const error = {};
      const shouldRetry = swrConfig.shouldRetryOnError?.(error);
      expect(shouldRetry).toBe(false);
    });
  });

  describe(`onError`, () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // @ts-expect-error - mocking window
      global.window = {
        location: {
          pathname: `/dashboard`,
          href: ``,
        },
      };
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it(`should redirect on 401 error`, () => {
      const error = { status: 401 };
      swrConfig.onError?.(error);

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(`/login?session_expired=true&next=%2Fdashboard`);
    });

    it(`should redirect on session expired message`, () => {
      const error = { message: `Session expired` };
      swrConfig.onError?.(error);

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(`/login?session_expired=true&next=%2Fdashboard`);
    });

    it(`should not redirect on other errors`, () => {
      const error = { status: 500 };
      swrConfig.onError?.(error);

      // @ts-expect-error - mocking window
      expect(global.window.location.href).toBe(``);
    });
  });
});
