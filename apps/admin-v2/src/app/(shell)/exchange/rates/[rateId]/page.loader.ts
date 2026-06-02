import { getExchangeRateCaseResult } from '../../../../../lib/admin-api/exchange.server';
import { getAdminIdentity } from '../../../../../lib/admin-api/identity.server';

type RateResult = Awaited<ReturnType<typeof getExchangeRateCaseResult>>;
type RateReady = Extract<RateResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

export type ExchangeRateCasePageData = {
  identity: Identity;
  rate: RateReady[`data`];
};

type ExchangeRateCasePageLoadResult =
  | { status: `ready`; data: ExchangeRateCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadExchangeRateCasePage({
  rateId,
}: {
  rateId: string;
}): Promise<ExchangeRateCasePageLoadResult> {
  const [identity, rateResult] = await Promise.all([getAdminIdentity(), getExchangeRateCaseResult(rateId)]);

  if (rateResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (rateResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (rateResult.status === `error`) {
    return { status: `error` };
  }

  return {
    status: `ready`,
    data: { identity, rate: rateResult.data },
  };
}
