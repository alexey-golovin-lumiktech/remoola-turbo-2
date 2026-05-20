'use server';

import {
  adminV2DisablePaymentMethodBodySchema,
  adminV2RemoveDefaultPaymentMethodBodySchema,
  adminV2VersionedMutationBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import { parseRequiredVersion, parseOptionalConsumerId } from './form-helpers';
import { revalidatePaymentMethodPaths } from './revalidation';

export async function disablePaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2DisablePaymentMethodBodySchema.parse({ version, confirmed, reason });
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/disable`,
    body,
    `Failed to disable payment method`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function removeDefaultPaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2RemoveDefaultPaymentMethodBodySchema.parse({ version });
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/remove-default`,
    body,
    `Failed to remove payment method default`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function escalateDuplicatePaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/duplicate-escalate`,
    body,
    `Failed to escalate duplicate payment method`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}
