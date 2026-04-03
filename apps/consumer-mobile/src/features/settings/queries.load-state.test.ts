/**
 * Load-state normalization tests for consumer-mobile settings (Phase C).
 * State mapping: 200+valid -> ready; 401/403 -> unauthorized; network/timeout/parse -> error.
 */

import { deriveLoadState, getProfile, getSettings, isTerminalSettingsState } from './queries';
import { getEnv } from '../../lib/env.server';

jest.mock(`../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

const validProfile = {
  id: `user-1`,
  accountType: `CONTRACTOR`,
  hasPassword: true,
  personalDetails: null,
  addressDetails: null,
  organizationDetails: null,
};

const validSettings = { theme: `light`, preferredCurrency: `USD` };

describe(`settings queries load-state`, () => {
  describe(`deriveLoadState`, () => {
    it(`returns ready when profile is ok`, () => {
      expect(deriveLoadState({ kind: `ok`, data: validProfile }, { kind: `ok`, data: validSettings })).toBe(`ready`);
    });

    it(`returns unauthorized when either profile or settings is unauthorized`, () => {
      expect(deriveLoadState({ kind: `unauthorized` }, { kind: `ok`, data: validSettings })).toBe(`unauthorized`);
      expect(deriveLoadState({ kind: `ok`, data: validProfile }, { kind: `unauthorized` })).toBe(`unauthorized`);
    });

    it(`returns error when either profile or settings is error`, () => {
      expect(deriveLoadState({ kind: `error` }, { kind: `ok`, data: validSettings })).toBe(`error`);
      expect(deriveLoadState({ kind: `ok`, data: validProfile }, { kind: `error` })).toBe(`error`);
    });
  });

  describe(`terminal-state guard`, () => {
    it(`keeps loading/ready as non-terminal`, () => {
      expect(isTerminalSettingsState(`loading`)).toBe(false);
      expect(isTerminalSettingsState(`ready`)).toBe(false);
    });

    it(`marks unauthorized/error as terminal`, () => {
      expect(isTerminalSettingsState(`unauthorized`)).toBe(true);
      expect(isTerminalSettingsState(`error`)).toBe(true);
    });
  });

  describe(`getProfile state mapping`, () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      (getEnv as jest.Mock).mockReturnValue({
        NEXT_PUBLIC_API_BASE_URL: `https://api.example.com`,
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it(`200 + valid payload -> ok (ready)`, async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(validProfile), {
          status: 200,
          headers: { 'content-type': `application/json` },
        }),
      ) as unknown as typeof fetch;
      const result = await getProfile(`cookie=abc`);
      expect(result).toEqual({ kind: `ok`, data: validProfile });
      const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Cookie).toBe(`cookie=abc`);
      expect(headers.origin).toBe(`http://localhost:3002`);
    });

    it(`401 -> unauthorized`, async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: `Unauthorized` }), { status: 401 }),
        ) as unknown as typeof fetch;
      const result = await getProfile(`cookie=abc`);
      expect(result).toEqual({ kind: `unauthorized` });
    });

    it(`403 -> unauthorized`, async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: `Forbidden` }), { status: 403 }),
        ) as unknown as typeof fetch;
      const result = await getProfile(`cookie=abc`);
      expect(result).toEqual({ kind: `unauthorized` });
    });

    it(`network/timeout/parse failure -> error`, async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error(`network failure`)) as unknown as typeof fetch;
      const result = await getProfile(`cookie=abc`);
      expect(result).toEqual({ kind: `error` });
    });

    it(`invalid JSON/schema -> error`, async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(`not json`, {
          status: 200,
          headers: { 'content-type': `application/json` },
        }),
      ) as unknown as typeof fetch;
      const result = await getProfile(`cookie=abc`);
      expect(result).toEqual({ kind: `error` });
    });
  });

  describe(`getSettings state mapping`, () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      (getEnv as jest.Mock).mockReturnValue({
        NEXT_PUBLIC_API_BASE_URL: `https://api.example.com`,
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it(`200 + valid payload -> ok`, async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(validSettings), {
          status: 200,
          headers: { 'content-type': `application/json` },
        }),
      ) as unknown as typeof fetch;
      const result = await getSettings(`cookie=abc`);
      expect(result).toEqual({ kind: `ok`, data: validSettings });
      const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Cookie).toBe(`cookie=abc`);
      expect(headers.origin).toBe(`http://localhost:3002`);
    });

    it(`401 -> unauthorized`, async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 401 })) as unknown as typeof fetch;
      const result = await getSettings(`cookie=abc`);
      expect(result).toEqual({ kind: `unauthorized` });
    });
  });
});
