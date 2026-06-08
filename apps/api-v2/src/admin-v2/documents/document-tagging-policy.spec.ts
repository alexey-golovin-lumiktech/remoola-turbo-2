import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  assertAllowedTagsEditable,
  assertBulkTagRequest,
  assertDeleteConfirmed,
  assertTagNameAvailable,
  assertVersionMatches,
  normalizeBulkTagResources,
  normalizeTagName,
  parseRequiredVersion,
} from './document-tagging-policy';
import { buildStaleVersionPayload } from '../admin-v2-version-utils';

describe(`document tagging policy`, () => {
  it(`rejects empty tag names and reserved invoice tag names`, () => {
    expect(() => normalizeTagName(`  `)).toThrow(BadRequestException);
    expect(() => normalizeTagName(` INVOICE-PENDING `)).toThrow(ConflictException);
  });

  it(`rejects invalid versions and missing delete confirmation`, () => {
    expect(() => parseRequiredVersion(undefined, `Tag version is required`)).toThrow(BadRequestException);
    expect(() => parseRequiredVersion(0, `Tag version is required`)).toThrow(BadRequestException);
    expect(() => assertDeleteConfirmed(false)).toThrow(BadRequestException);
  });

  it(`preserves the stale-version payload shape for tag and document guards`, () => {
    const updatedAt = new Date(`2026-04-17T11:00:00.000Z`);

    try {
      assertVersionMatches(`Document tag`, updatedAt, updatedAt.getTime() + 1);
      throw new Error(`expected stale version conflict`);
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual(buildStaleVersionPayload(`Document tag`, updatedAt));
    }

    try {
      assertVersionMatches(`Document`, updatedAt, updatedAt.getTime() + 1);
      throw new Error(`expected stale version conflict`);
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual(buildStaleVersionPayload(`Document`, updatedAt));
    }
  });

  it(`rejects duplicate tag names and reserved tag selections`, () => {
    expect(() => assertTagNameAvailable({ id: `tag-2` }, `tag-1`)).toThrow(ConflictException);
    expect(() => assertAllowedTagsEditable([{ name: `INVOICE-PENDING` }])).toThrow(ConflictException);
  });

  it(`trims bulk resources, drops blank ids, and preserves numeric versions`, () => {
    expect(
      normalizeBulkTagResources([
        { resourceId: ` doc-1 `, version: `5` },
        { resourceId: ``, version: `7` },
        { resourceId: ` doc-2 `, version: 9 },
      ]),
    ).toEqual([
      { resourceId: `doc-1`, version: 5 },
      { resourceId: `doc-2`, version: 9 },
    ]);
  });

  it(`requires at least one bulk tag and one bulk document`, () => {
    expect(() => assertBulkTagRequest([], [{ resourceId: `doc-1`, version: 1 }])).toThrow(BadRequestException);
    expect(() => assertBulkTagRequest([`tag-1`], [])).toThrow(BadRequestException);
  });
});
