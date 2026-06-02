import {
  getConsumerActionLog,
  getConsumerAuthHistory,
  getConsumerCaseResult,
  getConsumerContracts,
  getConsumerLedgerSummary,
} from '../../../../lib/admin-api/consumers.server';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { readReturnTo } from '../../../../lib/navigation-context';

type ConsumerCaseResult = Awaited<ReturnType<typeof getConsumerCaseResult>>;
type ConsumerCaseReady = Extract<ConsumerCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type Contracts = Awaited<ReturnType<typeof getConsumerContracts>>;
type LedgerSummary = Awaited<ReturnType<typeof getConsumerLedgerSummary>>;
type AuthHistory = Awaited<ReturnType<typeof getConsumerAuthHistory>>;
type ActionLog = Awaited<ReturnType<typeof getConsumerActionLog>>;

export type ConsumerPageData = {
  identity: Identity;
  consumer: ConsumerCaseReady[`data`];
  contracts: Contracts;
  ledgerSummary: LedgerSummary;
  authHistory: AuthHistory;
  actionLog: ActionLog;
  backToQueueHref: string;
};

type ConsumerPageLoadResult =
  | { status: `ready`; data: ConsumerPageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadConsumerPage({
  consumerId,
  searchParams,
}: {
  consumerId: string;
  searchParams: { from?: string } | undefined;
}): Promise<ConsumerPageLoadResult> {
  const [identity, consumerResult, contracts, ledgerSummary, authHistory, actionLog] = await Promise.all([
    getAdminIdentity(),
    getConsumerCaseResult(consumerId),
    getConsumerContracts({ consumerId, pageSize: 5 }),
    getConsumerLedgerSummary(consumerId),
    getConsumerAuthHistory({ consumerId, pageSize: 5 }),
    getConsumerActionLog({ consumerId, pageSize: 5 }),
  ]);

  if (consumerResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (consumerResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (consumerResult.status === `error`) {
    return { status: `error` };
  }

  return {
    status: `ready`,
    data: {
      identity,
      consumer: consumerResult.data,
      contracts,
      ledgerSummary,
      authHistory,
      actionLog,
      backToQueueHref: readReturnTo(searchParams?.from, `/consumers`),
    },
  };
}
