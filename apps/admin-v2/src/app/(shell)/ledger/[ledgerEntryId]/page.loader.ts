import { getAdmins } from '../../../../lib/admin-api/admins.server';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getLedgerEntryCaseResult } from '../../../../lib/admin-api/ledger.server';
import { readReturnTo } from '../../../../lib/navigation-context';

type LedgerEntryCaseResult = Awaited<ReturnType<typeof getLedgerEntryCaseResult>>;
type LedgerEntryCaseReady = Extract<LedgerEntryCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type AdminsResponse = Awaited<ReturnType<typeof getAdmins>>;
type ReassignCandidate = NonNullable<AdminsResponse>[`items`][number];

export type LedgerEntryCasePageData = {
  identity: Identity;
  ledgerCase: LedgerEntryCaseReady[`data`];
  reassignCandidates: ReassignCandidate[];
  backToQueueHref: string;
};

type LedgerEntryCasePageLoadResult =
  | { status: `ready`; data: LedgerEntryCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadLedgerEntryCasePage({
  ledgerEntryId,
  searchParams,
}: {
  ledgerEntryId: string;
  searchParams: { from?: string } | undefined;
}): Promise<LedgerEntryCasePageLoadResult> {
  const [ledgerCaseResult, identity] = await Promise.all([getLedgerEntryCaseResult(ledgerEntryId), getAdminIdentity()]);

  if (ledgerCaseResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (ledgerCaseResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (ledgerCaseResult.status === `error`) {
    return { status: `error` };
  }

  const ledgerCase = ledgerCaseResult.data;
  const currentAssignment = ledgerCase.assignment.current;
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );
  const backToQueueHref = readReturnTo(searchParams?.from, `/ledger`);

  return {
    status: `ready`,
    data: { identity, ledgerCase, reassignCandidates, backToQueueHref },
  };
}
