import { type $Enums } from '@remoola/database-2';

import {
  buildExchangeExecutionSummary,
  type ExchangeExecutionSummary,
  mapExchangeExecutionFailureReason,
} from './exchange-execution-summary';
import { getCurrencyFractionDigits } from '../../shared-common';
import { type AdminV2DomainEvent } from '../admin-v2-domain-events.service';

type RuleExecutionSummaryParams = {
  source: string;
  actorId: string;
  idempotencyKey: string;
  now: Date;
};

type AmountDecision =
  | { kind: `failed`; reason: `balance_below_target` | `no_amount_to_convert` }
  | { kind: `convert`; amountToConvert: number };

export function decideAmountToConvert(
  available: number,
  targetBalanceRaw: { toString(): string } | number | string | null,
  maxConvertAmountRaw: { toString(): string } | number | string | null,
): AmountDecision {
  const targetBalance = Number(targetBalanceRaw);
  let amountToConvert = available - targetBalance;

  if (available <= targetBalance) {
    return {
      kind: `failed`,
      reason: `balance_below_target`,
    };
  }

  if (maxConvertAmountRaw != null) {
    amountToConvert = Math.min(amountToConvert, Number(maxConvertAmountRaw));
  }

  if (!Number.isFinite(amountToConvert) || amountToConvert <= 0) {
    return {
      kind: `failed`,
      reason: `no_amount_to_convert`,
    };
  }

  return {
    kind: `convert`,
    amountToConvert,
  };
}

export function buildFailedRuleExecution(
  params: RuleExecutionSummaryParams,
  reason: string,
): { executionState: `failed`; summary: ExchangeExecutionSummary } {
  return {
    executionState: `failed`,
    summary: buildExchangeExecutionSummary({
      status: `failed`,
      reason,
      executedAt: params.now,
      source: params.source,
      actorId: params.actorId,
      idempotencyKey: params.idempotencyKey,
    }),
  };
}

export function buildFailedRuleExecutionFromError(
  params: RuleExecutionSummaryParams,
  error: unknown,
): { executionState: `failed`; summary: ExchangeExecutionSummary } {
  return buildFailedRuleExecution(params, mapExchangeExecutionFailureReason(error));
}

export function buildExecutedRuleExecution(
  params: RuleExecutionSummaryParams,
  fromCurrency: $Enums.CurrencyCode,
  amountToConvert: number,
  conversion: { ledgerId: string; targetAmount: number | string },
): { executionState: `executed`; summary: ExchangeExecutionSummary } {
  return {
    executionState: `executed`,
    summary: buildExchangeExecutionSummary({
      status: `executed`,
      reason: `conversion_executed`,
      executedAt: params.now,
      ledgerId: conversion.ledgerId,
      targetAmount: conversion.targetAmount.toString(),
      sourceAmount: amountToConvert.toFixed(getCurrencyFractionDigits(fromCurrency)),
      source: params.source,
      actorId: params.actorId,
      idempotencyKey: params.idempotencyKey,
    }),
  };
}

export function buildRuleExecutionEvent(
  adminId: string,
  ruleId: string,
  version: number,
  summary: ExchangeExecutionSummary,
): AdminV2DomainEvent {
  return {
    eventType: summary.status === `executed` ? `exchange.executed` : `exchange.failed`,
    timestamp: new Date().toISOString(),
    actorId: adminId,
    resourceType: `exchange_rule`,
    resourceId: ruleId,
    producerVersion: version,
    metadata: {
      reason: summary.reason,
      ledgerId: summary.ledgerId ?? null,
      sourceAmount: summary.sourceAmount ?? null,
      targetAmount: summary.targetAmount ?? null,
    },
  };
}
