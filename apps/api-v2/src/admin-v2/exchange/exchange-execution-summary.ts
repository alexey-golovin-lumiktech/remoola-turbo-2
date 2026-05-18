import { BadRequestException, NotFoundException } from '@nestjs/common';

export type ExchangeExecutionState = `executed` | `failed`;

export type ExchangeExecutionSummary = {
  status: `executed` | `failed`;
  reason: string;
  executedAt: string;
  ledgerId?: string | null;
  targetAmount?: string | null;
  sourceAmount?: string | null;
  idempotencyKey?: string | null;
  source: string;
  actorId?: string | null;
};

export function buildExchangeExecutionSummary(params: {
  status: ExchangeExecutionState;
  reason: string;
  executedAt: Date;
  ledgerId?: string | null;
  targetAmount?: string | null;
  sourceAmount?: string | null;
  source: string;
  actorId?: string | null;
  idempotencyKey?: string | null;
}): ExchangeExecutionSummary {
  return {
    status: params.status,
    reason: params.reason,
    executedAt: params.executedAt.toISOString(),
    ledgerId: params.ledgerId ?? null,
    targetAmount: params.targetAmount ?? null,
    sourceAmount: params.sourceAmount ?? null,
    source: params.source,
    actorId: params.actorId ?? null,
    idempotencyKey: params.idempotencyKey ?? null,
  };
}

export function mapExchangeExecutionFailureReason(error: unknown) {
  if (error instanceof NotFoundException || error instanceof BadRequestException) {
    const response = error.getResponse();
    if (typeof response === `string`) {
      return response;
    }
    if (response && typeof response === `object` && `message` in response) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === `string`) {
        return message;
      }
      if (Array.isArray(message) && typeof message[0] === `string`) {
        return message[0];
      }
    }
    return error.message;
  }

  return error instanceof Error ? error.message : `Unknown error`;
}
