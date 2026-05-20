import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { pathSegment, withQuery } from '../query-contract';
import {
  type AdminV2VerificationQueueQuery,
  type VerificationCaseResponse,
  type VerificationQueueResponse,
} from './types';

export async function getVerificationQueue(
  params?: AdminV2VerificationQueueQuery,
): Promise<VerificationQueueResponse | null> {
  return fetchAdminApi<VerificationQueueResponse>(
    withQuery(`/admin-v2/verification/queue`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      status: params?.status,
      stripeIdentityStatus: params?.stripeIdentityStatus,
      country: params?.country,
      contractorKind: params?.contractorKind,
      missingProfileData: params?.missingProfileData === true ? true : undefined,
      missingDocuments: params?.missingDocuments === true ? true : undefined,
    }),
  );
}

export async function getVerificationCaseResult(
  consumerId: string,
): Promise<AdminApiReadResult<VerificationCaseResponse>> {
  const id = pathSegment(consumerId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<VerificationCaseResponse>(`/admin-v2/verification/${id}`);
}
