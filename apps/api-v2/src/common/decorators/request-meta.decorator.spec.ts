import { describe, expect, it } from '@jest/globals';
import { type Request } from 'express';

import { getRequestMeta } from './request-meta.decorator';

describe(`getRequestMeta`, () => {
  it(`preserves the prior controller-local metadata extraction for scalar headers`, () => {
    const req = {
      ip: `203.0.113.5`,
      headers: {
        'x-forwarded-for': `198.51.100.10`,
        'user-agent': `jest`,
        'idempotency-key': `idem-7`,
      },
    } as unknown as Request;

    expect(getRequestMeta(req)).toEqual({
      ipAddress: `203.0.113.5`,
      userAgent: `jest`,
      idempotencyKey: `idem-7`,
    });
  });

  it(`falls back to the first forwarded/header value when request fields are absent or arrays`, () => {
    const req = {
      headers: {
        'x-forwarded-for': [`198.51.100.10`, `198.51.100.11`],
        'user-agent': [`jest`, `browser`],
        'idempotency-key': [`idem-7`, `idem-8`],
      },
    } as unknown as Request;

    expect(getRequestMeta(req)).toEqual({
      ipAddress: `198.51.100.10`,
      userAgent: `jest`,
      idempotencyKey: `idem-7`,
    });
  });

  it(`normalizes missing metadata to null`, () => {
    const req = { headers: {} } as unknown as Request;

    expect(getRequestMeta(req)).toEqual({
      ipAddress: null,
      userAgent: null,
      idempotencyKey: null,
    });
  });
});
