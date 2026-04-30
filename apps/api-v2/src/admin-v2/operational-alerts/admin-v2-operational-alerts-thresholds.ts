import { BadRequestException } from '@nestjs/common';

import {
  ADMIN_V2_MAX_COUNT_GT_VALUE,
  ADMIN_V2_MIN_COUNT_GT_VALUE,
  ADMIN_V2_SUPPORTED_THRESHOLD_TYPES,
  getAdminV2JsonPayloadBytes,
  type AdminV2OperationalAlertThreshold,
} from '@remoola/api-types';

import { type OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';

const SUPPORTED_THRESHOLD_TYPES = ADMIN_V2_SUPPORTED_THRESHOLD_TYPES;

export type OperationalAlertThreshold = AdminV2OperationalAlertThreshold;

export const MIN_COUNT_GT_VALUE = ADMIN_V2_MIN_COUNT_GT_VALUE;
export const MAX_COUNT_GT_VALUE = ADMIN_V2_MAX_COUNT_GT_VALUE;

export function assertValidThresholdPayload(
  raw: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workspace: OperationalAlertWorkspace,
): asserts raw is OperationalAlertThreshold {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    throw new BadRequestException(`thresholdPayload must be a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== `string` || !(SUPPORTED_THRESHOLD_TYPES as readonly string[]).includes(type)) {
    throw new BadRequestException(`thresholdPayload.type must be one of: ${SUPPORTED_THRESHOLD_TYPES.join(`, `)}`);
  }
  if (type !== `count_gt`) {
    throw new BadRequestException(`Unhandled threshold type: ${type}`);
  }

  const value = obj.value;
  if (typeof value !== `number` || !Number.isInteger(value)) {
    throw new BadRequestException(`count_gt.value must be an integer`);
  }
  if (value < MIN_COUNT_GT_VALUE || value > MAX_COUNT_GT_VALUE) {
    throw new BadRequestException(`count_gt.value must be between ${MIN_COUNT_GT_VALUE} and ${MAX_COUNT_GT_VALUE}`);
  }
  const allowedKeys = new Set([`type`, `value`]);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      throw new BadRequestException(`Unknown thresholdPayload key: ${key}`);
    }
  }
}

export function getThresholdPayloadBytes(raw: unknown): number {
  return getAdminV2JsonPayloadBytes(raw);
}
