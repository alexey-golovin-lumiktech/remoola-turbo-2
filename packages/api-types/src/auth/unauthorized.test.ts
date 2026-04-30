/**
 * Tests for isUnauthorizedError (401/403 classification).
 * Cross-surface unauthorized classification should stay consistent.
 */

import { isUnauthorizedError } from './unauthorized';

describe(`unauthorized (api-types)`, () => {
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

  describe(`cross-app equivalence`, () => {
    it(`same error shape produces the same result across surfaces`, () => {
      const err401 = Object.assign(new Error(`Unauthorized`), { status: 401 });
      const err403 = Object.assign(new Error(`Forbidden`), { status: 403 });
      const err500 = Object.assign(new Error(`Server error`), { status: 500 });
      expect(isUnauthorizedError(err401)).toBe(true);
      expect(isUnauthorizedError(err403)).toBe(true);
      expect(isUnauthorizedError(err500)).toBe(false);
    });
  });
});
