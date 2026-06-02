import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getVerificationCaseResult } from '../../../../lib/admin-api/verification.server';
import { loadReassignCandidates, type ReassignCandidate } from '../../../../lib/admin-permissions/reassign-candidates';
import { readReturnTo } from '../../../../lib/navigation-context';

type VerificationCaseResult = Awaited<ReturnType<typeof getVerificationCaseResult>>;
type VerificationCaseReady = Extract<VerificationCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

export type VerificationCasePageData = {
  identity: Identity;
  verificationCase: VerificationCaseReady[`data`];
  reassignCandidates: ReassignCandidate[];
  backToQueueHref: string;
};

type VerificationCasePageLoadResult =
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
  const canReassign = Boolean(
    verificationCase.assignment.current && verificationCase.decisionControls.canReassignAssignments,
  );
  const reassignCandidates = await loadReassignCandidates({ canReassign, assignment: verificationCase.assignment });
  const backToQueueHref = readReturnTo(searchParams?.from, `/verification`);

  return {
    status: `ready`,
    data: { identity, verificationCase, reassignCandidates, backToQueueHref },
  };
}
