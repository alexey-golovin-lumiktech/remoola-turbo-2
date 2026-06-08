import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import {
  assertExpectedDeletedAtNull,
  buildChangedFields,
  buildCreateAuditMetadata,
  buildDeleteAuditMetadata,
  buildUpdateAuditMetadata,
  normalizeDescription,
  toSummary,
  trimRequiredName,
} from './admin-v2-saved-views-policy';

describe(`AdminV2SavedViewsPolicy`, () => {
  it(`trims names and enforces max-length rules`, () => {
    expect(trimRequiredName(`  view  `)).toBe(`view`);
    expect(() => trimRequiredName(`   `)).toThrow(BadRequestException);
    expect(() => trimRequiredName(`a`.repeat(101))).toThrow(BadRequestException);
  });

  it(`normalizes descriptions and enforces max-length rules`, () => {
    expect(normalizeDescription(undefined)).toBeNull();
    expect(normalizeDescription(null)).toBeNull();
    expect(normalizeDescription(`   `)).toBeNull();
    expect(normalizeDescription(`  desc  `)).toBe(`desc`);
    expect(() => normalizeDescription(`a`.repeat(501))).toThrow(BadRequestException);
  });

  it(`validates expectedDeletedAtNull`, () => {
    expect(() => assertExpectedDeletedAtNull(0)).not.toThrow();
    expect(() => assertExpectedDeletedAtNull(1)).toThrow(BadRequestException);
  });

  it(`builds changed fields in stable order`, () => {
    expect(
      buildChangedFields({
        hasName: true,
        hasDescription: true,
        hasPayload: true,
      }),
    ).toEqual([`name`, `description`, `queryPayload`]);
  });

  it(`builds audit metadata without embedding raw query payloads`, () => {
    const createMeta = buildCreateAuditMetadata({
      workspace: `ledger_anomalies`,
      name: `My view`,
      payloadBytes: 120,
    });
    expect(createMeta).toEqual({
      workspace: `ledger_anomalies`,
      name: `My view`,
      payloadBytes: 120,
      severity: `standard`,
    });
    expect(createMeta).not.toHaveProperty(`queryPayload`);

    const updateMeta = buildUpdateAuditMetadata({
      workspace: `ledger_anomalies`,
      hasName: true,
      hasDescription: false,
      hasPayload: true,
      previousName: `Old name`,
      nextName: `New name`,
      payloadBytes: 200,
    });
    expect(updateMeta).toEqual({
      workspace: `ledger_anomalies`,
      changedFields: [`name`, `queryPayload`],
      previousName: `Old name`,
      payloadBytes: 200,
      severity: `standard`,
    });
    expect(updateMeta).not.toHaveProperty(`queryPayload`);

    expect(
      buildUpdateAuditMetadata({
        workspace: `ledger_anomalies`,
        hasName: true,
        hasDescription: false,
        hasPayload: false,
        previousName: `Same name`,
        nextName: `Same name`,
        payloadBytes: null,
      }),
    ).toEqual({
      workspace: `ledger_anomalies`,
      changedFields: [`name`],
      severity: `standard`,
    });

    expect(buildDeleteAuditMetadata({ workspace: `ledger_anomalies`, name: `My view` })).toEqual({
      workspace: `ledger_anomalies`,
      name: `My view`,
      severity: `standard`,
    });
  });

  it(`serializes summary timestamps without changing shape`, () => {
    expect(
      toSummary({
        id: `view-1`,
        ownerId: `owner-1`,
        workspace: `ledger_anomalies`,
        name: `My view`,
        description: null,
        queryPayload: [`a`, `b`],
        createdAt: new Date(`2026-04-21T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-21T10:05:00.000Z`),
        deletedAt: null,
      }),
    ).toEqual({
      id: `view-1`,
      workspace: `ledger_anomalies`,
      name: `My view`,
      description: null,
      queryPayload: [`a`, `b`],
      createdAt: `2026-04-21T10:00:00.000Z`,
      updatedAt: `2026-04-21T10:05:00.000Z`,
    });
  });
});
