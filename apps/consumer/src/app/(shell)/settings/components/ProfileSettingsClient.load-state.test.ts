/**
 * Load-state normalization tests for consumer settings (Phase C).
 * State mapping: 200+valid -> ready; 401/403 -> unauthorized; network/timeout/parse -> error.
 */

import {
  isTerminalSettingsState,
  mapProfileResponseToLoadState,
  mapSettingsResponseToLoadState,
} from './ProfileSettingsClient';

const validProfile = {
  id: `user-1`,
  accountType: `CONTRACTOR`,
  personalDetails: null,
  addressDetails: null,
  organizationDetails: null,
};

describe(`ProfileSettingsClient load-state mapping`, () => {
  describe(`200 + valid payload -> ready`, () => {
    it(`returns ready state with profile when response is ok`, () => {
      const result = mapProfileResponseToLoadState({ ok: true, data: validProfile });
      expect(result.state).toBe(`ready`);
      expect(result.profile).toEqual(validProfile);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe(`401/403 -> unauthorized`, () => {
    it(`returns unauthorized for 401`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 401,
        error: { message: `Unauthorized` },
      });
      expect(result.state).toBe(`unauthorized`);
      expect(result.profile).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it(`returns unauthorized for 403`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 403,
        error: { message: `Forbidden` },
      });
      expect(result.state).toBe(`unauthorized`);
      expect(result.profile).toBeUndefined();
    });
  });

  describe(`network/timeout/parse/schema -> error`, () => {
    it(`returns error state for 500 with message`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 500,
        error: { message: `Internal Server Error` },
      });
      expect(result.state).toBe(`error`);
      expect(result.errorMessage).toBe(`Internal Server Error`);
    });

    it(`returns error state for 408 timeout`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 408,
        error: { message: `Request timeout` },
      });
      expect(result.state).toBe(`error`);
      expect(result.errorMessage).toBe(`Request timeout`);
    });

    it(`returns error state for status 0 (network failure)`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 0,
        error: { message: `Network error` },
      });
      expect(result.state).toBe(`error`);
      expect(result.errorMessage).toBe(`Network error`);
    });

    it(`returns error with fallback message when error message missing`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 502,
        error: {},
      });
      expect(result.state).toBe(`error`);
      expect(result.errorMessage).toBe(`Failed to load profile`);
    });
  });

  describe(`unauthorized does not show generic profile-failed copy`, () => {
    it(`unauthorized state has no errorMessage so UI does not show generic failure`, () => {
      const result = mapProfileResponseToLoadState({
        ok: false,
        status: 401,
        error: { message: `Unauthorized` },
      });
      expect(result.state).toBe(`unauthorized`);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe(`terminal-state guard`, () => {
    it(`does not treat loading as terminal`, () => {
      expect(isTerminalSettingsState(`loading`)).toBe(false);
    });

    it(`does not treat ready as terminal`, () => {
      expect(isTerminalSettingsState(`ready`)).toBe(false);
    });

    it(`treats unauthorized/error as terminal`, () => {
      expect(isTerminalSettingsState(`unauthorized`)).toBe(true);
      expect(isTerminalSettingsState(`error`)).toBe(true);
    });
  });

  describe(`settings response mapping`, () => {
    it(`maps 401/403 to unauthorized`, () => {
      expect(mapSettingsResponseToLoadState({ ok: false, status: 401 })).toBe(`unauthorized`);
      expect(mapSettingsResponseToLoadState({ ok: false, status: 403 })).toBe(`unauthorized`);
    });

    it(`maps non-auth failures to error`, () => {
      expect(mapSettingsResponseToLoadState({ ok: false, status: 500 })).toBe(`error`);
    });

    it(`maps successful response to ready`, () => {
      expect(mapSettingsResponseToLoadState({ ok: true, status: 200 })).toBe(`ready`);
    });
  });
});
