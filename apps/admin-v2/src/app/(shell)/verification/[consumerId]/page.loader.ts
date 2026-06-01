import { getAdmins } from '../../../../lib/admin-api/admins.server';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getVerificationCaseResult } from '../../../../lib/admin-api/verification.server';
import { readReturnTo } from '../../../../lib/navigation-context';

type VerificationCaseResult = Awaited<ReturnType<typeof getVerificationCaseResult>>;
type VerificationCaseReady = Extract<VerificationCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type AdminsResponse = Awaited<ReturnType<typeof getAdmins>>;
type ReassignCandidate = NonNullable<AdminsResponse>[`items`][number];

export type VerificationCasePageData = {
  identity: Identity;
  verificationCase: VerificationCaseReady[`data`];
  reassignCandidates: ReassignCandidate[];
  backToQueueHref: string;
};

export type VerificationCasePageLoadResult =
  | { status: `ready`; data: VerificationCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadVerificationCasePage({
  consumerId,
  searchParams,
}: {
  consumerId: string;
  searchParams: { from?: string } | undefined;
}): Promise<VerificationCasePageLoadResult> {
  const [verificationCaseResult, identity] = await Promise.all([
    getVerificationCaseResult(consumerId),
    getAdminIdentity(),
  ]);

  if (verificationCaseResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (verificationCaseResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (verificationCaseResult.status === `error`) {
    return { status: `error` };
  }

  const verificationCase = verificationCaseResult.data;
  const currentAssignment = verificationCase.assignment.current;
  const canReassign = Boolean(currentAssignment && verificationCase.decisionControls.canReassignAssignments);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );
  const backToQueueHref = readReturnTo(searchParams?.from, `/verification`);

  return {
    status: `ready`,
    data: { identity, verificationCase, reassignCandidates, backToQueueHref },
  };
}
