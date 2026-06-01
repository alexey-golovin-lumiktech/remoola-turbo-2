import { getAdminCaseRecordResult, getAdminSessionsResult } from '../../../../lib/admin-api/admins.server';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { readReturnTo } from '../../../../lib/navigation-context';

type AdminCaseResult = Awaited<ReturnType<typeof getAdminCaseRecordResult>>;
type AdminCaseReady = Extract<AdminCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type AdminSessionResult = Awaited<ReturnType<typeof getAdminSessionsResult>>;
type AdminSession = Extract<AdminSessionResult, { status: `ready` }>[`data`][`sessions`][number];

export type AdminCasePageData = {
  identity: Identity;
  admin: AdminCaseReady[`data`];
  sessionResult: AdminSessionResult | null;
  sessions: AdminSession[];
  backToQueueHref: string;
};

export type AdminCasePageLoadResult =
  | { status: `ready`; data: AdminCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadAdminCasePage({
  adminId,
  searchParams,
}: {
  adminId: string;
  searchParams: { from?: string } | undefined;
}): Promise<AdminCasePageLoadResult> {
  const [identity, adminResult] = await Promise.all([getAdminIdentity(), getAdminCaseRecordResult(adminId)]);

  if (adminResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (adminResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (adminResult.status === `error`) {
    return { status: `error` };
  }

  const admin = adminResult.data;
  const canReadSessions = identity?.capabilities.includes(`admins.read`) ?? false;
  const sessionResult = canReadSessions ? await getAdminSessionsResult(admin.core.id) : null;
  const sessions = sessionResult?.status === `ready` ? sessionResult.data.sessions : [];
  const backToQueueHref = readReturnTo(searchParams?.from, `/admins`);

  return {
    status: `ready`,
    data: { identity, admin, sessionResult, sessions, backToQueueHref },
  };
}
