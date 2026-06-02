import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getLedgerEntryCaseResult } from '../../../../lib/admin-api/ledger.server';
import { loadReassignCandidates, type ReassignCandidate } from '../../../../lib/admin-permissions/reassign-candidates';
import { readReturnTo } from '../../../../lib/navigation-context';

type LedgerEntryCaseResult = Awaited<ReturnType<typeof getLedgerEntryCaseResult>>;
type LedgerEntryCaseReady = Extract<LedgerEntryCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

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
  const canReassign = Boolean(ledgerCase.assignment.current && identity?.role === `SUPER_ADMIN`);
  const reassignCandidates = await loadReassignCandidates({ canReassign, assignment: ledgerCase.assignment });
  const backToQueueHref = readReturnTo(searchParams?.from, `/ledger`);

  return {
    status: `ready`,
    data: { identity, ledgerCase, reassignCandidates, backToQueueHref },
  };
}
