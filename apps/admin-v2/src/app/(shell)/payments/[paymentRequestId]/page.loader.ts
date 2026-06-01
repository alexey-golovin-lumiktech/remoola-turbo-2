import { derivePaymentPagePermissions } from './page.permissions';
import { getAdmins } from '../../../../lib/admin-api/admins.server';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getPaymentCaseResult } from '../../../../lib/admin-api/payments.server';
import { readReturnTo } from '../../../../lib/navigation-context';

type PaymentCaseResult = Awaited<ReturnType<typeof getPaymentCaseResult>>;
type PaymentCaseReady = Extract<PaymentCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type AdminsResponse = NonNullable<Awaited<ReturnType<typeof getAdmins>>>;
type ReassignCandidate = AdminsResponse[`items`][number];

export type PaymentPageData = {
  identity: Identity;
  paymentCase: PaymentCaseReady[`data`];
  reassignCandidates: ReassignCandidate[];
  backToQueueHref: string;
};

export type PaymentPageLoadResult =
  | { status: `ready`; data: PaymentPageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadPaymentPage({
  paymentRequestId,
  searchParams,
}: {
  paymentRequestId: string;
  searchParams: { from?: string } | undefined;
}): Promise<PaymentPageLoadResult> {
  const [paymentCaseResult, identity] = await Promise.all([getPaymentCaseResult(paymentRequestId), getAdminIdentity()]);

  if (paymentCaseResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (paymentCaseResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (paymentCaseResult.status === `error`) {
    return { status: `error` };
  }

  const paymentCase = paymentCaseResult.data;
  const { canReassign } = derivePaymentPagePermissions(identity, paymentCase);
  const currentAssignment = paymentCase.assignment.current;
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );
  const backToQueueHref = readReturnTo(searchParams?.from, `/payments`);

  return {
    status: `ready`,
    data: {
      identity,
      paymentCase,
      reassignCandidates,
      backToQueueHref,
    },
  };
}
