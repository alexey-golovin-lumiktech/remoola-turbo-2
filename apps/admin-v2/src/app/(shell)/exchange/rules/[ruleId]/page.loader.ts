import { getExchangeRuleCaseResult } from '../../../../../lib/admin-api/exchange.server';
import { getAdminIdentity } from '../../../../../lib/admin-api/identity.server';

type RuleResult = Awaited<ReturnType<typeof getExchangeRuleCaseResult>>;
type RuleReady = Extract<RuleResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

export type ExchangeRuleCasePageData = {
  identity: Identity;
  rule: RuleReady[`data`];
};

type ExchangeRuleCasePageLoadResult =
  | { status: `ready`; data: ExchangeRuleCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadExchangeRuleCasePage({
  ruleId,
}: {
  ruleId: string;
}): Promise<ExchangeRuleCasePageLoadResult> {
  const [identity, ruleResult] = await Promise.all([getAdminIdentity(), getExchangeRuleCaseResult(ruleId)]);

  if (ruleResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (ruleResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (ruleResult.status === `error`) {
    return { status: `error` };
  }

  return {
    status: `ready`,
    data: { identity, rule: ruleResult.data },
  };
}
