import { BadRequestException } from '@nestjs/common';

type AdminV2IdempotencyJson =
  | string
  | number
  | boolean
  | null
  | AdminV2IdempotencyJson[]
  | { [key: string]: AdminV2IdempotencyJson };

export type AdminV2IdempotencySnapshot = { [key: string]: AdminV2IdempotencyJson };

function assertJsonHashable(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value === `string` || typeof value === `boolean`) {
    return;
  }
  if (typeof value === `number`) {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`Idempotency payload must be JSON serializable`);
    }
    return;
  }
  if (
    typeof value === `undefined` ||
    typeof value === `function` ||
    typeof value === `symbol` ||
    typeof value === `bigint`
  ) {
    throw new BadRequestException(`Idempotency payload must be JSON serializable`);
  }
  if (Array.isArray(value)) {
    value.forEach((item) => assertJsonHashable(item, seen));
    return;
  }
  if (!isPlainJsonObject(value)) {
    throw new BadRequestException(`Idempotency payload must be a plain JSON object or array`);
  }
  if (seen.has(value)) {
    throw new BadRequestException(`Idempotency payload must not contain circular references`);
  }
  seen.add(value);
  Object.values(value).forEach((nested) => assertJsonHashable(nested, seen));
  seen.delete(value);
}

export function stableStringifyJson(value: unknown): string {
  assertJsonHashable(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringifyJson(item)).join(`,`)}]`;
  }
  if (value && typeof value === `object`) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringifyJson(nested)}`)
      .join(`,`)}}`;
  }
  return JSON.stringify(value);
}

export function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== `object` || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toJsonValue(value: unknown): AdminV2IdempotencyJson {
  if (value === null || typeof value === `string` || typeof value === `boolean`) {
    return value as AdminV2IdempotencyJson;
  }

  if (typeof value === `number`) {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`Idempotent response must be JSON serializable`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (isPlainJsonObject(value)) {
    const jsonObject: AdminV2IdempotencySnapshot = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested === undefined || typeof nested === `function` || typeof nested === `symbol`) {
        throw new BadRequestException(`Idempotent response must be JSON serializable`);
      }
      jsonObject[key] = toJsonValue(nested);
    }
    return jsonObject;
  }

  throw new BadRequestException(`Idempotent response must be JSON serializable`);
}

export function toIdempotencyResponseSnapshot(value: unknown): AdminV2IdempotencySnapshot {
  if (!isPlainJsonObject(value)) {
    throw new BadRequestException(`Idempotent response must be a JSON object`);
  }
  return toJsonValue(value) as AdminV2IdempotencySnapshot;
}
