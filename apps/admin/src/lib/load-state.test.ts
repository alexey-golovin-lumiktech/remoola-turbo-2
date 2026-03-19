/**
 * Load-state normalization tests for admin protected pages (Phase C).
 * isUnauthorizedError: 401/403 -> true; other -> false.
 */

import { deriveAdminProtectedLoadState, isUnauthorizedError } from './load-state';

describe(`load-state (admin)`, () => {
  describe(`isUnauthorizedError`, () => {
    it(`returns true for 401`, () => {
      expect(isUnauthorizedError(Object.assign(new Error(`Unauthorized`), { status: 401 }))).toBe(true);
    });

    it(`returns true for 403`, () => {
      expect(isUnauthorizedError(Object.assign(new Error(`Forbidden`), { status: 403 }))).toBe(true);
    });

    it(`returns false for 500`, () => {
      expect(isUnauthorizedError(Object.assign(new Error(`Server error`), { status: 500 }))).toBe(false);
    });

    it(`returns false for 404`, () => {
      expect(isUnauthorizedError(Object.assign(new Error(`Not found`), { status: 404 }))).toBe(false);
    });

    it(`returns false for error without status`, () => {
      expect(isUnauthorizedError(new Error(`Network error`))).toBe(false);
    });

    it(`returns false for null/undefined`, () => {
      expect(isUnauthorizedError(null)).toBe(false);
      expect(isUnauthorizedError(undefined)).toBe(false);
    });
  });

  describe(`deriveAdminProtectedLoadState`, () => {
    it(`keeps loading while auth truth is unresolved`, () => {
      expect(
        deriveAdminProtectedLoadState({
          authResolved: false,
          hasData: false,
          error: Object.assign(new Error(`Unauthorized`), { status: 401 }),
        }),
      ).toBe(`loading`);
    });

    it(`maps auth errors to unauthorized once auth is resolved`, () => {
      expect(
        deriveAdminProtectedLoadState({
          authResolved: true,
          hasData: false,
          error: Object.assign(new Error(`Unauthorized`), { status: 401 }),
        }),
      ).toBe(`unauthorized`);
    });

    it(`maps non-auth errors to error once auth is resolved`, () => {
      expect(
        deriveAdminProtectedLoadState({
          authResolved: true,
          hasData: false,
          error: Object.assign(new Error(`Server error`), { status: 500 }),
        }),
      ).toBe(`error`);
    });

    it(`returns ready when auth resolved and data exists`, () => {
      expect(
        deriveAdminProtectedLoadState({
          authResolved: true,
          hasData: true,
        }),
      ).toBe(`ready`);
    });
  });
});
