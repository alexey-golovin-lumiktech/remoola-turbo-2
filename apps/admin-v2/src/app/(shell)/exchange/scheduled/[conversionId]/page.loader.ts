import { getAdmins } from '../../../../../lib/admin-api/admins.server';
import { getExchangeScheduledCaseResult } from '../../../../../lib/admin-api/exchange.server';
import { getAdminIdentity } from '../../../../../lib/admin-api/identity.server';

type ConversionResult = Awaited<ReturnType<typeof getExchangeScheduledCaseResult>>;
type ConversionReady = Extract<ConversionResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type AdminsResponse = Awaited<ReturnType<typeof getAdmins>>;
type ReassignCandidate = NonNullable<AdminsResponse>[`items`][number];

export type ExchangeScheduledCasePageData = {
  identity: Identity;
  conversion: ConversionReady[`data`];
  reassignCandidates: ReassignCandidate[];
};

type ExchangeScheduledCasePageLoadResult =
  | { status: `ready`; data: ExchangeScheduledCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadExchangeScheduledCasePage({
  conversionId,
}: {
  conversionId: string;
}): Promise<ExchangeScheduledCasePageLoadResult> {
  const [identity, conversionResult] = await Promise.all([
    getAdminIdentity(),
    getExchangeScheduledCaseResult(conversionId),
  ]);

  if (conversionResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (conversionResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (conversionResult.status === `error`) {
    return { status: `error` };
  }

  const conversion = conversionResult.data;
  const currentAssignment = conversion.assignment.current;
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return {
    status: `ready`,
    data: { identity, conversion, reassignCandidates },
  };
}
