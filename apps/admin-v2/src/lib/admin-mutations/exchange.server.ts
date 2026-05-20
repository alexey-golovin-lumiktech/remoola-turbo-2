'use server';

import {
  adminV2ApproveRateBodySchema,
  adminV2StepUpConfirmedVersionedMutationBodySchema,
  adminV2StepUpVersionedMutationBodySchema,
  adminV2VersionedMutationBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import {
  parseRequiredVersion,
  parseOptionalConsumerId,
  parsePasswordConfirmation,
  buildAssignmentClaimBody,
  buildAssignmentReleaseBody,
  buildAssignmentReassignBody,
} from './form-helpers';
import {
  revalidateExchangeRatePaths,
  revalidateExchangeRulePaths,
  revalidateExchangeScheduledPaths,
  revalidateFxConversionAssignmentPaths,
} from './revalidation';

export async function approveExchangeRateAction(rateId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2ApproveRateBodySchema.parse({ version, confirmed, reason, passwordConfirmation });
  await postAdminMutation(`/admin-v2/exchange/rates/${rateId}/approve`, body, `Failed to approve exchange rate`);
  revalidateExchangeRatePaths(rateId);
}

export async function pauseExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/pause`, body, `Failed to pause exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function resumeExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/resume`, body, `Failed to resume exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function runExchangeRuleNowAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2StepUpVersionedMutationBodySchema.parse({ version, passwordConfirmation });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/run-now`, body, `Failed to run exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function forceExecuteScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2StepUpConfirmedVersionedMutationBodySchema.parse({ version, confirmed, passwordConfirmation });
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/force-execute`,
    body,
    `Failed to force execute scheduled conversion`,
  );
  revalidateExchangeScheduledPaths(conversionId, consumerId);
}

export async function cancelScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2StepUpConfirmedVersionedMutationBodySchema.parse({ version, confirmed, passwordConfirmation });
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/cancel`,
    body,
    `Failed to cancel scheduled conversion`,
  );
  revalidateExchangeScheduledPaths(conversionId, consumerId);
}

export async function claimFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  if (!conversionId) {
    throw new Error(`conversionId is required`);
  }
  const body = buildAssignmentClaimBody(`fx_conversion`, conversionId, formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, `Failed to claim scheduled FX conversion assignment`);
  revalidateFxConversionAssignmentPaths(conversionId);
}

export async function releaseFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  if (!conversionId) {
    throw new Error(`conversionId is required`);
  }
  const body = buildAssignmentReleaseBody(formData);
  await postAdminMutation(
    `/admin-v2/assignments/release`,
    body,
    `Failed to release scheduled FX conversion assignment`,
  );
  revalidateFxConversionAssignmentPaths(conversionId);
}

export async function reassignFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  if (!conversionId) {
    throw new Error(`conversionId is required`);
  }
  const body = buildAssignmentReassignBody(formData);
  await postAdminMutation(
    `/admin-v2/assignments/reassign`,
    body,
    `Failed to reassign scheduled FX conversion assignment`,
  );
  revalidateFxConversionAssignmentPaths(conversionId);
}
