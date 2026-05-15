import { BadRequestException } from '@nestjs/common';

import { stableStringifyJson, toIdempotencyResponseSnapshot } from './admin-v2-idempotency-json.utils';

describe(`admin-v2 idempotency JSON helpers`, () => {
  it(`builds stable hashes independent of object key order`, () => {
    expect(stableStringifyJson({ b: 2, a: 1 })).toBe(stableStringifyJson({ a: 1, b: 2 }));
    expect(stableStringifyJson({ a: [2, 1] })).not.toBe(stableStringifyJson({ a: [1, 2] }));
  });

  it(`rejects non-JSON idempotency payloads`, () => {
    expect(() => stableStringifyJson({ generatedAt: new Date(`2026-04-17T12:00:00.000Z`) })).toThrow(
      BadRequestException,
    );
    expect(() => stableStringifyJson({ value: Number.NaN })).toThrow(BadRequestException);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => stableStringifyJson(circular)).toThrow(`Idempotency payload must not contain circular references`);
  });

  it(`coerces response snapshots to JSON object contracts`, () => {
    expect(
      toIdempotencyResponseSnapshot({
        ok: true,
        nested: { codes: [`approved`] },
      }),
    ).toEqual({
      ok: true,
      nested: { codes: [`approved`] },
    });
    expect(() => toIdempotencyResponseSnapshot([`not-object`])).toThrow(`Idempotent response must be a JSON object`);
  });
});
