import { Injectable } from '@nestjs/common';

import { AdminV2VerificationService } from '../verification/admin-v2-verification.service';

import type { OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';
import type {
  EvaluationResult,
  OperationalAlertWorkspaceEvaluator,
} from './admin-v2-operational-alerts-workspace-evaluators';

type VerificationQueueQuery = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
};

const SUPPORTED_PAYLOAD_KEYS = new Set([`status`, `stripeIdentityStatus`, `country`, `contractorKind`]);

const REJECTED_PAYLOAD_KEYS = new Set([`missingProfileData`, `missingDocuments`, `page`, `pageSize`]);

function parseVerificationQueuePayload(raw: unknown): VerificationQueueQuery {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== `object` || Array.isArray(raw)) {
    throw new Error(`queryPayload must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (REJECTED_PAYLOAD_KEYS.has(key)) {
      throw new Error(
        `queryPayload key "${key}" is not supported by verification_queue evaluator (frontend-only filter)`,
      );
    }
    if (!SUPPORTED_PAYLOAD_KEYS.has(key)) {
      throw new Error(`queryPayload key "${key}" is not recognized`);
    }
  }
  const result: VerificationQueueQuery = {};
  if (typeof obj.status === `string` && obj.status.trim().length > 0) {
    result.status = obj.status.trim();
  }
  if (typeof obj.stripeIdentityStatus === `string` && obj.stripeIdentityStatus.trim().length > 0) {
    result.stripeIdentityStatus = obj.stripeIdentityStatus.trim();
  }
  if (typeof obj.country === `string` && obj.country.trim().length > 0) {
    result.country = obj.country.trim();
  }
  if (typeof obj.contractorKind === `string` && obj.contractorKind.trim().length > 0) {
    result.contractorKind = obj.contractorKind.trim();
  }
  return result;
}

@Injectable()
export class VerificationQueueAlertEvaluator implements OperationalAlertWorkspaceEvaluator {
  constructor(private readonly verification: AdminV2VerificationService) {}

  async evaluate(queryPayload: unknown, threshold: OperationalAlertThreshold): Promise<EvaluationResult> {
    const filters = parseVerificationQueuePayload(queryPayload);
    const count = await this.verification.getQueueCount(filters);

    if (threshold.type === `count_gt`) {
      const fired = count > threshold.value;
      return {
        fired,
        reason: fired ? `queue count=${count} exceeded threshold=${threshold.value} (count_gt)` : null,
        observedValue: count,
      };
    }
    const _exhaustive: never = threshold.type as never;
    throw new Error(`Unhandled threshold type for verification_queue: ${String(_exhaustive)}`);
  }
}
