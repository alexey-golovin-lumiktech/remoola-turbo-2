import { describe, expect, it } from '@jest/globals';

import {
  buildDocumentDownloadUrl,
  buildDocumentEvidenceScopeWhere,
  resolveCanonicalConsumer,
  uniqueIds,
} from './document-query-helpers';

describe(`document query helpers`, () => {
  describe(`buildDocumentEvidenceScopeWhere`, () => {
    it(`keeps admin documents scoped to consumer resources or payment attachments`, () => {
      expect(buildDocumentEvidenceScopeWhere()).toEqual({
        OR: [
          {
            consumerResources: {
              some: {
                deletedAt: null,
              },
            },
          },
          {
            attachments: {
              some: {
                deletedAt: null,
              },
            },
          },
        ],
      });
    });

    it(`requires active consumer resource linkage in the consumer branch`, () => {
      const where = buildDocumentEvidenceScopeWhere();

      expect(where.OR?.[0]).toEqual({
        consumerResources: {
          some: {
            deletedAt: null,
          },
        },
      });
    });

    it(`requires active payment request attachment linkage in the attachment branch`, () => {
      const where = buildDocumentEvidenceScopeWhere();

      expect(where.OR?.[1]).toEqual({
        attachments: {
          some: {
            deletedAt: null,
          },
        },
      });
    });
  });

  describe(`buildDocumentDownloadUrl`, () => {
    it(`builds relative and absolute admin document download URLs`, () => {
      expect(buildDocumentDownloadUrl(`resource-1`)).toBe(`/api/admin-v2/documents/resource-1/download`);
      expect(buildDocumentDownloadUrl(`resource-1`, `https://api.example.com`)).toBe(
        `https://api.example.com/api/admin-v2/documents/resource-1/download`,
      );
    });
  });

  describe(`resolveCanonicalConsumer`, () => {
    it(`returns the sole linked consumer with nullable dates serialized`, () => {
      expect(
        resolveCanonicalConsumer([
          {
            consumer: {
              id: `consumer-1`,
              email: `owner@example.com`,
              deletedAt: new Date(`2026-04-17T08:00:00.000Z`),
            },
          },
        ]),
      ).toEqual({
        id: `consumer-1`,
        email: `owner@example.com`,
        deletedAt: `2026-04-17T08:00:00.000Z`,
      });
    });

    it(`degrades empty and ambiguous consumer linkage to null`, () => {
      expect(resolveCanonicalConsumer([])).toBeNull();
      expect(
        resolveCanonicalConsumer([
          {
            consumer: {
              id: `consumer-1`,
              email: `owner-1@example.com`,
              deletedAt: null,
            },
          },
          {
            consumer: {
              id: `consumer-2`,
              email: `owner-2@example.com`,
              deletedAt: null,
            },
          },
        ]),
      ).toBeNull();
    });
  });

  describe(`uniqueIds`, () => {
    it(`trims, deduplicates, and removes blank ids`, () => {
      expect(uniqueIds([` tag-1 `, ``, `tag-2`, `tag-1`, `  `, `tag-2`])).toEqual([`tag-1`, `tag-2`]);
      expect(uniqueIds(null)).toEqual([]);
      expect(uniqueIds(undefined)).toEqual([]);
    });
  });
});
