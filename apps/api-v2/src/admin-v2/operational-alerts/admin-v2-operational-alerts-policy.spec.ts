import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import {
  assertExpectedDeletedAtNull,
  assertHasUpdateFields,
  assertRequiredWorkspace,
  buildChangedFields,
  buildCreateAuditMetadata,
  buildDeleteAuditMetadata,
  buildUpdateAuditMetadata,
  normalizeDescription,
  normalizeEvaluationInterval,
  shouldResetEvaluationState,
  toSummary,
  trimRequiredName,
} from './admin-v2-operational-alerts-policy';

describe(`AdminV2OperationalAlertsPolicy`, () => {
  it(`distinguishes required workspace from unknown workspace`, () => {
    expect(() => assertRequiredWorkspace(undefined)).toThrow(BadRequestException);
    expect(() => assertRequiredWorkspace(`payments`)).toThrow(BadRequestException);
    expect(assertRequiredWorkspace(`ledger_anomalies`)).toBe(`ledger_anomalies`);
  });

  it(`trims names and enforces max-length rules`, () => {
    expect(trimRequiredName(`  alert  `)).toBe(`alert`);
    expect(() => trimRequiredName(`   `)).toThrow(BadRequestException);
    expect(() => trimRequiredName(`a`.repeat(101))).toThrow(BadRequestException);
  });

  it(`normalizes descriptions and enforces max-length rules`, () => {
    expect(normalizeDescription(undefined)).toBeNull();
    expect(normalizeDescription(`   `)).toBeNull();
    expect(normalizeDescription(`  desc  `)).toBe(`desc`);
    expect(() => normalizeDescription(`a`.repeat(501))).toThrow(BadRequestException);
  });

  it(`defaults, validates integer-ness, and enforces interval range`, () => {
    expect(normalizeEvaluationInterval(undefined)).toBe(5);
    expect(normalizeEvaluationInterval(null)).toBe(5);
    expect(normalizeEvaluationInterval(60)).toBe(60);
    expect(() => normalizeEvaluationInterval(1.5)).toThrow(BadRequestException);
    expect(() => normalizeEvaluationInterval(0)).toThrow(BadRequestException);
    expect(() => normalizeEvaluationInterval(1441)).toThrow(BadRequestException);
  });

  it(`validates expectedDeletedAtNull and non-empty update field sets`, () => {
    expect(() => assertExpectedDeletedAtNull(1)).toThrow(BadRequestException);
    expect(() =>
      assertHasUpdateFields({
        hasName: false,
        hasDescription: false,
        hasQueryPayload: false,
        hasThresholdPayload: false,
        hasInterval: false,
      }),
    ).toThrow(BadRequestException);
  });

  it(`builds changed fields in stable order and reset semantics`, () => {
    expect(
      buildChangedFields({
        hasName: true,
        hasDescription: true,
        hasQueryPayload: true,
        hasThresholdPayload: true,
        hasInterval: true,
      }),
    ).toEqual([`name`, `description`, `queryPayload`, `thresholdPayload`, `evaluationIntervalMinutes`]);

    expect(shouldResetEvaluationState({ hasQueryPayload: false, hasThresholdPayload: false, hasInterval: false })).toBe(
      false,
    );
    expect(shouldResetEvaluationState({ hasQueryPayload: true, hasThresholdPayload: false, hasInterval: false })).toBe(
      true,
    );
  });

  it(`builds audit metadata without embedding raw JSON payloads`, () => {
    const createMeta = buildCreateAuditMetadata({
      workspace: `ledger_anomalies`,
      name: `My alert`,
      evaluationIntervalMinutes: 5,
      queryPayloadBytes: 100,
      thresholdPayloadBytes: 40,
      thresholdType: `count_gt`,
    });
    expect(createMeta).toEqual({
      workspace: `ledger_anomalies`,
      name: `My alert`,
      evaluationIntervalMinutes: 5,
      queryPayloadBytes: 100,
      thresholdPayloadBytes: 40,
      thresholdType: `count_gt`,
      severity: `standard`,
    });
    expect(createMeta).not.toHaveProperty(`queryPayload`);
    expect(createMeta).not.toHaveProperty(`thresholdPayload`);

    const updateMeta = buildUpdateAuditMetadata({
      workspace: `ledger_anomalies`,
      hasName: true,
      hasDescription: false,
      hasQueryPayload: true,
      hasThresholdPayload: false,
      hasInterval: false,
      previousName: `Old name`,
      nextName: `New name`,
      queryPayloadBytes: 120,
      thresholdPayloadBytes: null,
      thresholdType: null,
    });
    expect(updateMeta).toEqual({
      workspace: `ledger_anomalies`,
      changedFields: [`name`, `queryPayload`],
      evaluationStateReset: true,
      previousName: `Old name`,
      queryPayloadBytes: 120,
      severity: `standard`,
    });
    expect(updateMeta).not.toHaveProperty(`queryPayload`);
    expect(updateMeta).not.toHaveProperty(`thresholdPayload`);

    expect(buildDeleteAuditMetadata({ workspace: `ledger_anomalies`, name: `My alert` })).toEqual({
      workspace: `ledger_anomalies`,
      name: `My alert`,
      severity: `standard`,
    });
  });

  it(`serializes summary timestamps and nulls without changing shape`, () => {
    expect(
      toSummary({
        id: `alert-1`,
        ownerId: `owner-1`,
        workspace: `ledger_anomalies`,
        name: `My alert`,
        description: null,
        queryPayload: null,
        thresholdPayload: { type: `count_gt`, value: 5 },
        evaluationIntervalMinutes: 5,
        lastEvaluatedAt: new Date(`2026-04-21T10:35:00.000Z`),
        lastEvaluationError: null,
        lastFiredAt: null,
        lastFireReason: null,
        createdAt: new Date(`2026-04-21T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-21T10:05:00.000Z`),
        deletedAt: null,
      }),
    ).toEqual({
      id: `alert-1`,
      workspace: `ledger_anomalies`,
      name: `My alert`,
      description: null,
      queryPayload: null,
      thresholdPayload: { type: `count_gt`, value: 5 },
      evaluationIntervalMinutes: 5,
      lastEvaluatedAt: `2026-04-21T10:35:00.000Z`,
      lastEvaluationError: null,
      lastFiredAt: null,
      lastFireReason: null,
      createdAt: `2026-04-21T10:00:00.000Z`,
      updatedAt: `2026-04-21T10:05:00.000Z`,
    });
  });
});
