import { BadRequestException, Injectable } from '@nestjs/common';

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
export type OperationalAlertObservation = {
  observedValue: number;
  reasonSubject: string;
  reasonDetail?: string;
};
export type ThresholdEvaluationResult = {
  fired: boolean;
  reason: string | null;
  observedValue?: number;
};
export interface OperationalAlertThresholdEvaluator<T extends OperationalAlertThreshold = OperationalAlertThreshold> {
  readonly type: T[`type`];
  validate(raw: Record<string, unknown>): void;
  evaluate(observation: OperationalAlertObservation, threshold: OperationalAlertThreshold): ThresholdEvaluationResult;
}

export const MIN_COUNT_GT_VALUE = ADMIN_V2_MIN_COUNT_GT_VALUE;
export const MAX_COUNT_GT_VALUE = ADMIN_V2_MAX_COUNT_GT_VALUE;
export const OPERATIONAL_ALERT_THRESHOLD_EVALUATOR_REGISTRY = Symbol(`OPERATIONAL_ALERT_THRESHOLD_EVALUATOR_REGISTRY`);
export type OperationalAlertThresholdEvaluatorRegistry = Readonly<
  Record<OperationalAlertThreshold[`type`], OperationalAlertThresholdEvaluator>
>;

@Injectable()
export class CountGtThresholdEvaluator implements OperationalAlertThresholdEvaluator<
  Extract<OperationalAlertThreshold, { type: `count_gt` }>
> {
  readonly type = `count_gt` as const;

  validate(raw: Record<string, unknown>): void {
    const value = raw.value;
    if (typeof value !== `number` || !Number.isInteger(value)) {
      throw new BadRequestException(`count_gt.value must be an integer`);
    }
    if (value < MIN_COUNT_GT_VALUE || value > MAX_COUNT_GT_VALUE) {
      throw new BadRequestException(`count_gt.value must be between ${MIN_COUNT_GT_VALUE} and ${MAX_COUNT_GT_VALUE}`);
    }
    const allowedKeys = new Set([`type`, `value`]);
    for (const key of Object.keys(raw)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Unknown thresholdPayload key: ${key}`);
      }
    }
  }

  evaluate(observation: OperationalAlertObservation, threshold: OperationalAlertThreshold): ThresholdEvaluationResult {
    if (threshold.type !== `count_gt`) {
      throw new BadRequestException(`Unhandled threshold type: ${threshold.type}`);
    }
    const fired = observation.observedValue > threshold.value;
    return {
      fired,
      reason: fired
        ? `${observation.reasonSubject}=${observation.observedValue}${
            observation.reasonDetail ? ` ${observation.reasonDetail}` : ``
          } exceeded threshold=${threshold.value} (count_gt)`
        : null,
      observedValue: observation.observedValue,
    };
  }
}

export const DEFAULT_OPERATIONAL_ALERT_THRESHOLD_EVALUATORS = Object.freeze({
  count_gt: new CountGtThresholdEvaluator(),
} satisfies OperationalAlertThresholdEvaluatorRegistry);

export function assertValidThresholdPayload(
  raw: unknown,
  // Workspace stays in the API for future workspace-specific threshold strategy selection.
  workspace: OperationalAlertWorkspace,
  evaluators: OperationalAlertThresholdEvaluatorRegistry = DEFAULT_OPERATIONAL_ALERT_THRESHOLD_EVALUATORS,
): asserts raw is OperationalAlertThreshold {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    throw new BadRequestException(`thresholdPayload must be a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== `string` || !(SUPPORTED_THRESHOLD_TYPES as readonly string[]).includes(type)) {
    throw new BadRequestException(`thresholdPayload.type must be one of: ${SUPPORTED_THRESHOLD_TYPES.join(`, `)}`);
  }
  const thresholdEvaluator = evaluators[type as OperationalAlertThreshold[`type`]];
  if (!thresholdEvaluator) {
    throw new BadRequestException(`Unhandled threshold type: ${type}`);
  }
  thresholdEvaluator.validate(obj);
}

export function getThresholdPayloadBytes(raw: unknown): number {
  return getAdminV2JsonPayloadBytes(raw);
}
