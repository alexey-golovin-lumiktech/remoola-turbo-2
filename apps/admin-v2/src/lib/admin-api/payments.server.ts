import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { dateSearchParam, pathSegment, withQuery } from '../query-contract';
import {
  type AdminV2PaymentMethodsListQuery,
  type AdminV2PaymentsListQuery,
  type AdminV2PayoutsListQuery,
  type PaymentCaseResponse,
  type PaymentMethodCaseResponse,
  type PaymentMethodsListResponse,
  type PaymentOperationsQueueResponse,
  type PaymentsListResponse,
  type PayoutCaseResponse,
  type PayoutsListResponse,
} from './types';

export async function getPayments(params?: AdminV2PaymentsListQuery): Promise<PaymentsListResponse | null> {
  return fetchAdminApi<PaymentsListResponse>(
    withQuery(`/admin-v2/payments`, {
      limit: params?.limit ?? 25,
      cursor: params?.cursor,
      q: params?.q,
      status: params?.status,
      paymentRail: params?.paymentRail,
      currencyCode: params?.currencyCode,
      amountMin: params?.amountMin,
      amountMax: params?.amountMax,
      dueDateFrom: dateSearchParam(params?.dueDateFrom),
      dueDateTo: dateSearchParam(params?.dueDateTo),
      createdFrom: dateSearchParam(params?.createdFrom),
      createdTo: dateSearchParam(params?.createdTo),
      overdue: params?.overdue === true ? true : undefined,
    }),
  );
}

export async function getPaymentCaseResult(paymentRequestId: string): Promise<AdminApiReadResult<PaymentCaseResponse>> {
  const id = pathSegment(paymentRequestId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<PaymentCaseResponse>(`/admin-v2/payments/${id}`);
}

export async function getPaymentOperationsQueue(): Promise<PaymentOperationsQueueResponse | null> {
  return fetchAdminApi<PaymentOperationsQueueResponse>(`/admin-v2/payments/operations-queue`);
}

export async function getPaymentMethods(
  params?: AdminV2PaymentMethodsListQuery,
): Promise<PaymentMethodsListResponse | null> {
  return fetchAdminApi<PaymentMethodsListResponse>(
    withQuery(`/admin-v2/payment-methods`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      consumerId: params?.consumerId,
      type: params?.type,
      defaultSelected: params?.defaultSelected,
      fingerprint: params?.fingerprint,
      includeDeleted: params?.includeDeleted === true ? true : undefined,
    }),
  );
}

export async function getPayouts(params?: AdminV2PayoutsListQuery): Promise<PayoutsListResponse | null> {
  return fetchAdminApi<PayoutsListResponse>(
    withQuery(`/admin-v2/payouts`, {
      limit: params?.limit ?? 25,
      cursor: params?.cursor,
    }),
  );
}

export async function getPayoutCaseResult(payoutId: string): Promise<AdminApiReadResult<PayoutCaseResponse>> {
  const id = pathSegment(payoutId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<PayoutCaseResponse>(`/admin-v2/payouts/${id}`);
}

export async function getPaymentMethodCaseResult(
  paymentMethodId: string,
): Promise<AdminApiReadResult<PaymentMethodCaseResponse>> {
  const id = pathSegment(paymentMethodId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<PaymentMethodCaseResponse>(`/admin-v2/payment-methods/${id}`);
}
