'use server';

import {
  adminV2ApproveRateBodySchema,
  adminV2CancelScheduledExchangeBodySchema,
  adminV2ForceExecuteScheduledExchangeBodySchema,
  adminV2PauseExchangeRuleBodySchema,
  adminV2ResumeExchangeRuleBodySchema,
  adminV2RunExchangeRuleBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import { parseRequiredVersion, parseOptionalConsumerId, parsePasswordConfirmation } from './form-helpers';
import {
  revalidateExchangeRatePaths,
  revalidateExchangeRulePaths,
  revalidateExchangeScheduledPaths,
  revalidateFxConversionAssignmentPaths,
} from './revalidation';
import {
  runAssignmentClaim,
  runAssignmentReassign,
  runAssignmentRelease,
} from '../admin-permissions/assignment-action-core';

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
  const body = adminV2PauseExchangeRuleBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/pause`, body, `Failed to pause exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function resumeExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2ResumeExchangeRuleBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/resume`, body, `Failed to resume exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function runExchangeRuleNowAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2RunExchangeRuleBodySchema.parse({ version, passwordConfirmation });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/run-now`, body, `Failed to run exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function forceExecuteScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2ForceExecuteScheduledExchangeBodySchema.parse({ version, confirmed, passwordConfirmation });
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
  const body = adminV2CancelScheduledExchangeBodySchema.parse({ version, confirmed, passwordConfirmation });
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/cancel`,
    body,
    `Failed to cancel scheduled conversion`,
  );
  revalidateExchangeScheduledPaths(conversionId, consumerId);
}

export async function claimFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  return runAssignmentClaim({
    resourceType: `fx_conversion`,
    resourceId: conversionId,
    idLabel: `conversionId`,
    errorMessage: `Failed to claim scheduled FX conversion assignment`,
    formData,
    revalidate: () => revalidateFxConversionAssignmentPaths(conversionId),
  });
}

export async function releaseFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  return runAssignmentRelease({
    resourceId: conversionId,
    idLabel: `conversionId`,
    errorMessage: `Failed to release scheduled FX conversion assignment`,
    formData,
    revalidate: () => revalidateFxConversionAssignmentPaths(conversionId),
  });
}

export async function reassignFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  return runAssignmentReassign({
    resourceId: conversionId,
    idLabel: `conversionId`,
    errorMessage: `Failed to reassign scheduled FX conversion assignment`,
    formData,
    revalidate: () => revalidateFxConversionAssignmentPaths(conversionId),
  });
}
