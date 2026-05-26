import { type BadRequestException, type NotFoundException } from '@nestjs/common';

import { type $Enums, Prisma } from '@remoola/database-2';

import { getCurrencyFractionDigits } from '../../../shared-common';

export function getConsumerExchangeCurrencySymbol(currencyCode: $Enums.CurrencyCode): string {
  try {
    const parts = new Intl.NumberFormat(`en-US`, {
      style: `currency`,
      currency: currencyCode,
      currencyDisplay: `symbol`,
    }).formatToParts(0);
    return parts.find((part) => part.type === `currency`)?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

export function normalizeConsumerExchangeRule(rule: {
  id: string;
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  targetBalance: unknown;
  maxConvertAmount: unknown;
  minIntervalMinutes: number;
  enabled: boolean;
}) {
  return {
    id: rule.id,
    fromCurrency: rule.fromCurrency,
    toCurrency: rule.toCurrency,
    targetBalance: Number(rule.targetBalance),
    maxConvertAmount: rule.maxConvertAmount != null ? Number(rule.maxConvertAmount) : null,
    minIntervalMinutes: rule.minIntervalMinutes,
    enabled: rule.enabled,
  };
}

export function normalizeConsumerScheduledConversion(conversion: {
  id: string;
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  amount: unknown;
  executeAt: Date | string;
  status: $Enums.ScheduledFxConversionStatus;
}) {
  return {
    id: conversion.id,
    fromCurrency: conversion.fromCurrency,
    toCurrency: conversion.toCurrency,
    amount: Number(conversion.amount),
    executeAt:
      conversion.executeAt instanceof Date
        ? conversion.executeAt.toISOString()
        : new Date(conversion.executeAt).toISOString(),
    status: conversion.status,
  };
}

export function mergeConsumerExchangeRuleExecutionMetadata(
  metadata: Prisma.JsonValue | null | undefined,
  execution: Prisma.InputJsonObject,
) {
  return {
    ...(metadata && typeof metadata === `object` && !Array.isArray(metadata) ? metadata : {}),
    lastExecution: execution,
  } as Prisma.InputJsonValue;
}

export function roundConsumerExchangeAmountToCurrency(amount: number, currency: $Enums.CurrencyCode) {
  const digits = getCurrencyFractionDigits(currency);
  return Number(amount.toFixed(digits));
}

export function roundConsumerExchangeAmountToCurrencyDecimal(
  amount: Prisma.Decimal,
  currency: $Enums.CurrencyCode,
): Prisma.Decimal {
  const digits = getCurrencyFractionDigits(currency);
  return amount.toDecimalPlaces(digits, Prisma.Decimal.ROUND_HALF_UP);
}

export function getConsumerExchangeRateBatchErrorCode(error: BadRequestException | NotFoundException) {
  const response = error.getResponse();
  if (typeof response === `string`) {
    return response;
  }

  const message =
    response && typeof response === `object` && `message` in response
      ? (response as { message?: unknown }).message
      : undefined;
  if (typeof message === `string`) {
    return message;
  }

  if (Array.isArray(message) && typeof message[0] === `string`) {
    return message[0];
  }

  return error.message;
}
