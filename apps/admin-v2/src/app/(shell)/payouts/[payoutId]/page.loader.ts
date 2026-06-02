import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getPayoutCaseResult } from '../../../../lib/admin-api/payments.server';
import { loadReassignCandidates, type ReassignCandidate } from '../../../../lib/admin-permissions/reassign-candidates';
import { readReturnTo } from '../../../../lib/navigation-context';

type PayoutCaseResult = Awaited<ReturnType<typeof getPayoutCaseResult>>;
type PayoutCaseReady = Extract<PayoutCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

export type PayoutCasePageData = {
  identity: Identity;
  payoutCase: PayoutCaseReady[`data`];
  reassignCandidates: ReassignCandidate[];
  backToQueueHref: string;
};

type PayoutCasePageLoadResult =
  | { status: `ready`; data: PayoutCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadPayoutCasePage({
  payoutId,
  searchParams,
}: {
  payoutId: string;
  searchParams: { from?: string } | undefined;
}): Promise<PayoutCasePageLoadResult> {
  const [identity, payoutCaseResult] = await Promise.all([getAdminIdentity(), getPayoutCaseResult(payoutId)]);

  if (payoutCaseResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (payoutCaseResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (payoutCaseResult.status === `error`) {
    return { status: `error` };
  }

  const payoutCase = payoutCaseResult.data;
  const canReassign = Boolean(payoutCase.assignment.current && identity?.role === `SUPER_ADMIN`);
  const reassignCandidates = await loadReassignCandidates({ canReassign, assignment: payoutCase.assignment });
  const backToQueueHref = readReturnTo(searchParams?.from, `/payouts`);

  return {
    status: `ready`,
    data: { identity, payoutCase, reassignCandidates, backToQueueHref },
  };
}
